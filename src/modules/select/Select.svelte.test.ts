import { flushSync, mount, unmount } from "svelte";
import { Globe, Moon, Star } from "@lucide/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SELECT_SIZES, SELECT_VARIANTS, type SelectSize, type SelectVariant } from "./index.ts";
import SelectTestHost, { type TestSelectGroup, type TestSelectItem } from "./SelectTestHost.internal.svelte";

const DEFAULT_ITEMS: TestSelectItem[] = [
    { value: "de", plainText: "Germany" },
    { value: "fr", plainText: "France" },
    { value: "es", plainText: "Spain" },
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

function dispatchKeyUp(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent("keyup", {
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

function dispatchClick(target: EventTarget): MouseEvent {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function requireTrigger(root: ParentNode): HTMLButtonElement {
    return requireElement<HTMLButtonElement>(root, "button.cs-select-trigger");
}

function requireValueElement(root: ParentNode): HTMLSpanElement {
    return requireElement<HTMLSpanElement>(root, "span.cs-select-trigger-value");
}

function requireContent(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-select-content");
}

function requireListViewport(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-select-list");
}

function requireItem(root: ParentNode, value: string): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, `div.cs-select-item[data-value="${CSS.escape(value)}"]`);
}

function getHiddenInput(root: ParentNode): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('input[type="hidden"]');
}

describe("Select Svelte 5 Component", () => {
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
        container.addEventListener("click", (event: MouseEvent): void => {
            if (event.defaultPrevented || !(event.target instanceof Element)) return;
            const button = event.target.closest<HTMLButtonElement>("button[popovertarget]");
            if (!button || button.disabled) return;
            const targetId = button.getAttribute("popovertarget");
            if (!targetId) return;
            const targetEl = document.getElementById(targetId) as
                (HTMLElement & { togglePopover?: (options?: { source?: HTMLElement }) => boolean }) | null;
            if (!targetEl || !targetEl.hasAttribute("popover") || typeof targetEl.togglePopover !== "function") return;
            targetEl.togglePopover({ source: button });
        });
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
            expect(SELECT_VARIANTS).toEqual(["soft", "elevated"]);
            expect(SELECT_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
        });
    });

    describe("ARIA, DOM & Visual Contracts", () => {
        test("SelectTrigger enforces type='button' and role='combobox' with complete ARIA and data-* attributes", () => {
            const state = $state<{
                variant: SelectVariant;
                size: SelectSize;
                disabled: boolean;
                invalid: boolean;
                required: boolean;
                open: boolean;
            }>({
                variant: "soft",
                size: "md",
                disabled: false,
                invalid: false,
                required: false,
                open: false,
            });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    get disabled() {
                        return state.disabled;
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
                    triggerAttrs: {
                        type: "submit",
                        role: "button",
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            expect(trigger.tagName).toBe("BUTTON");
            expect(trigger.getAttribute("type")).toBe("button");
            expect(trigger.getAttribute("role")).toBe("combobox");
            expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect(trigger.getAttribute("aria-controls")).toBe(content.id);
            expect(trigger.getAttribute("popovertarget")).toBe(content.id);
            expect(trigger.hasAttribute("aria-invalid")).toBe(false);
            expect(trigger.hasAttribute("aria-required")).toBe(false);
            expect(trigger.dataset.variant).toBe("soft");
            expect(trigger.dataset.size).toBe("md");
            expect(trigger.dataset.state).toBe("closed");
            expect("placeholder" in trigger.dataset).toBe(true);
            expect("invalid" in trigger.dataset).toBe(false);
            expect("disabled" in trigger.dataset).toBe(false);
            expect(trigger.querySelector(".cs-select-trigger-chevron")?.getAttribute("aria-hidden")).toBe("true");

            for (const nextVariant of SELECT_VARIANTS) {
                state.variant = nextVariant;
                flushSync();
                expect(trigger.dataset.variant).toBe(nextVariant);
            }

            for (const nextSize of SELECT_SIZES) {
                state.size = nextSize;
                flushSync();
                expect(trigger.dataset.size).toBe(nextSize);
                expect(content.dataset.size).toBe(nextSize);
            }

            state.invalid = true;
            state.required = true;
            state.open = true;
            flushSync();
            expect(trigger.getAttribute("aria-invalid")).toBe("true");
            expect(trigger.getAttribute("aria-required")).toBe("true");
            expect(trigger.getAttribute("aria-expanded")).toBe("true");
            expect(trigger.dataset.state).toBe("open");
            expect("invalid" in trigger.dataset).toBe(true);

            state.open = false;
            state.disabled = true;
            flushSync();
            expect(trigger.disabled).toBe(true);
            expect("disabled" in trigger.dataset).toBe(true);
            expect(trigger.hasAttribute("popovertarget")).toBe(false);

            unmount(instance);
        });

        test("SelectTrigger supports disabled/invalid overrides, hideIndicator, and custom trigger/content IDs", () => {
            const state = $state<{
                rootDisabled: boolean;
                rootInvalid: boolean;
                triggerDisabled?: boolean;
                triggerInvalid?: boolean;
                hideIndicator: boolean;
                triggerId?: string;
                contentId?: string;
            }>({
                rootDisabled: true,
                rootInvalid: true,
                triggerDisabled: false,
                triggerInvalid: false,
                hideIndicator: false,
                triggerId: "custom-trigger",
                contentId: "custom-listbox",
            });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get disabled() {
                        return state.rootDisabled;
                    },
                    get invalid() {
                        return state.rootInvalid;
                    },
                    get triggerDisabled() {
                        return state.triggerDisabled;
                    },
                    get triggerInvalid() {
                        return state.triggerInvalid;
                    },
                    get triggerHideIndicator() {
                        return state.hideIndicator;
                    },
                    get triggerId() {
                        return state.triggerId;
                    },
                    get contentId() {
                        return state.contentId;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            expect(trigger.id).toBe("custom-trigger");
            expect(content.id).toBe("custom-listbox");
            expect(trigger.getAttribute("aria-controls")).toBe("custom-listbox");
            expect(content.getAttribute("aria-labelledby")).toBe("custom-trigger");

            // Explicit false on SelectTrigger overrides Select-level true
            expect(trigger.disabled).toBe(false);
            expect("disabled" in trigger.dataset).toBe(false);
            expect(trigger.hasAttribute("aria-invalid")).toBe(false);
            expect("invalid" in trigger.dataset).toBe(false);
            expect(trigger.querySelector(".cs-select-trigger-chevron")).not.toBeNull();

            // Explicit true on SelectTrigger overrides Select-level false
            state.rootDisabled = false;
            state.rootInvalid = false;
            state.triggerDisabled = true;
            state.triggerInvalid = true;
            state.hideIndicator = true;
            state.triggerId = "updated-trigger";
            state.contentId = "updated-listbox";
            flushSync();

            expect(trigger.disabled).toBe(true);
            expect("disabled" in trigger.dataset).toBe(true);
            expect(trigger.getAttribute("aria-invalid")).toBe("true");
            expect("invalid" in trigger.dataset).toBe(true);
            expect(trigger.querySelector(".cs-select-trigger-chevron")).toBeNull();
            expect(trigger.id).toBe("updated-trigger");
            expect(content.id).toBe("updated-listbox");
            expect(trigger.getAttribute("aria-controls")).toBe("updated-listbox");
            expect(content.getAttribute("aria-labelledby")).toBe("updated-trigger");

            unmount(instance);
        });

        test("SelectContent renders role='listbox', Popover placement/width/offset, maxHeight, and scrollbar", () => {
            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    id: "country",
                    size: "lg",
                    placement: "top-end",
                    width: "anchor",
                    offset: "12px",
                    maxHeight: "240px",
                    scrollbar: "always",
                    contentStyle: "z-index: 99",
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const scrollArea = requireElement<HTMLDivElement>(content, ".cs-scroll-area");

            expect(trigger.id).toBe("country");
            expect(content.id).toBe("country-listbox");
            expect(content.getAttribute("role")).toBe("listbox");
            expect(content.getAttribute("popover")).toBe("auto");
            expect(content.getAttribute("aria-labelledby")).toBe("country");
            expect(content.hasAttribute("aria-activedescendant")).toBe(false);
            expect(content.dataset.size).toBe("lg");
            expect(content.dataset.placement).toBe("top-end");
            expect(content.dataset.width).toBe("anchor");
            expect(content.style.getPropertyValue("--cs-popover-offset")).toBe("12px");
            expect(content.style.getPropertyValue("--cs-select-content-max-height")).toBe("240px");
            expect(content.style.zIndex).toBe("99");
            expect(scrollArea.dataset.scrollbar).toBe("always");

            unmount(instance);
        });

        test("SelectGroup links aria-labelledby to SelectGroupLabel and SelectSeparator renders role='separator'", () => {
            const state = $state<{ groups: TestSelectGroup[] }>({
                groups: [
                    {
                        key: "eu",
                        label: "Europe",
                        showLabel: true,
                        items: [
                            { value: "de", plainText: "Germany" },
                            { value: "fr", plainText: "France" },
                        ],
                    },
                    {
                        key: "na",
                        label: "North America",
                        labelId: "na-label",
                        showLabel: true,
                        items: [{ value: "us", plainText: "United States" }],
                    },
                ],
            });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get groups() {
                        return state.groups;
                    },
                    showSeparator: true,
                },
            });
            flushSync();

            const groupElements = [...container.querySelectorAll<HTMLDivElement>('div.cs-select-group[role="group"]')];
            expect(groupElements).toHaveLength(2);

            const firstGroup = groupElements.at(0);
            const secondGroup = groupElements.at(1);
            const firstLabel = firstGroup?.querySelector<HTMLDivElement>(".cs-select-group-label");
            const secondLabel = secondGroup?.querySelector<HTMLDivElement>(".cs-select-group-label");

            expect(firstLabel?.getAttribute("role")).toBe("presentation");
            expect(firstLabel?.id).toBeTruthy();
            expect(firstGroup?.getAttribute("aria-labelledby")).toBe(firstLabel?.id);
            expect(secondLabel?.id).toBe("na-label");
            expect(secondGroup?.getAttribute("aria-labelledby")).toBe("na-label");

            const separator = requireElement<HTMLDivElement>(container, 'div.cs-select-separator[role="separator"]');
            expect(separator.getAttribute("aria-orientation")).toBe("horizontal");

            // Unmounting SelectGroupLabel clears aria-labelledby on its SelectGroup; remounting restores it
            state.groups = state.groups.map((group, index) => (index === 0 ? { ...group, showLabel: false } : group));
            flushSync();
            expect(firstGroup?.hasAttribute("aria-labelledby")).toBe(false);

            state.groups = state.groups.map((group, index) => (index === 0 ? { ...group, showLabel: true } : group));
            flushSync();
            const restoredLabel = firstGroup?.querySelector<HTMLDivElement>(".cs-select-group-label");
            expect(restoredLabel?.id).toBeTruthy();
            expect(firstGroup?.getAttribute("aria-labelledby")).toBe(restoredLabel?.id);

            unmount(instance);
        });

        test("hidden input is rendered only when name is provided and syncs value & disabled state", () => {
            const state = $state<{ name?: string; value?: string; disabled: boolean }>({
                disabled: false,
            });

            const instance = mount(SelectTestHost, {
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
            const hiddenInput = getHiddenInput(container);
            expect(hiddenInput).not.toBeNull();
            expect(hiddenInput?.name).toBe("country");
            expect(hiddenInput?.value).toBe("");
            expect(hiddenInput?.disabled).toBe(false);

            dispatchClick(requireItem(container, "fr"));
            flushSync();
            expect(hiddenInput?.value).toBe("fr");

            state.disabled = true;
            flushSync();
            expect(hiddenInput?.disabled).toBe(true);

            state.value = undefined;
            flushSync();
            expect(hiddenInput?.value).toBe("");

            state.name = undefined;
            flushSync();
            expect(getHiddenInput(container)).toBeNull();

            unmount(instance);
        });
    });

    describe("Value Selection, SelectValue Resolution & Icon Mirroring", () => {
        test("handles default localized placeholder, custom placeholder, empty string, unknown value, and custom children", () => {
            const state = $state<{
                value?: string;
                placeholder?: string;
                triggerChildrenMode: "auto" | "value" | "value-snippet" | "custom";
            }>({
                triggerChildrenMode: "auto",
            });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get valuePlaceholder() {
                        return state.placeholder;
                    },
                    get triggerChildrenMode() {
                        return state.triggerChildrenMode;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            // "auto" mode relies on SelectTrigger's built-in <SelectValue /> fallback
            expect(requireValueElement(container).textContent?.trim()).toBe("Select…");
            expect("placeholder" in requireTrigger(container).dataset).toBe(true);
            expect("placeholder" in requireValueElement(container).dataset).toBe(true);

            // Switch to explicit <SelectValue> with custom placeholder (remounts SelectTrigger across {#if}/{:else})
            state.triggerChildrenMode = "value";
            state.placeholder = "Choose a country";
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("Choose a country");
            expect("placeholder" in requireValueElement(container).dataset).toBe(true);

            // Empty string still counts as placeholder
            state.value = "";
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("Choose a country");
            expect("placeholder" in requireTrigger(container).dataset).toBe(true);

            // Unknown value falls back to String(value) without placeholder flag
            state.value = "jp";
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("jp");
            expect("placeholder" in requireTrigger(container).dataset).toBe(false);
            expect("placeholder" in requireValueElement(container).dataset).toBe(false);

            // Custom SelectValue children snippet receives undefined and then SelectSelectedItem
            state.value = undefined;
            state.triggerChildrenMode = "value-snippet";
            flushSync();
            expect(requireElement<HTMLSpanElement>(container, '[data-testid="custom-value"]').textContent?.trim()).toBe(
                "None chosen"
            );

            dispatchClick(requireItem(container, "de"));
            flushSync();
            expect(requireElement<HTMLSpanElement>(container, '[data-testid="custom-value"]').textContent?.trim()).toBe(
                "de:Germany"
            );

            // Custom SelectTrigger children replaces SelectValue
            state.triggerChildrenMode = "custom";
            flushSync();
            expect(container.querySelector(".cs-select-trigger-value")).toBeNull();
            expect(requireElement<HTMLSpanElement>(container, '[data-testid="custom-trigger"]').textContent).toBe(
                "Custom trigger"
            );

            unmount(instance);
        });

        test("resolves labels from plain text, explicit label prop, and SelectItemText without leaking SelectItemDescription", () => {
            const state = $state<{ value?: string }>({});

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    items: [
                        { value: "de", plainText: "Germany" },
                        { value: "fr", label: "France (Canonical)", plainText: "FR Flag" },
                        {
                            value: "pro",
                            text: "Pro Plan",
                            description: "Includes priority support and unlimited seats",
                        },
                        {
                            value: "raw-desc",
                            plainText: "Starter Plan",
                            description: "Hidden from trigger label",
                        },
                        { value: "fallback-only" },
                    ],
                },
            });
            flushSync();

            const valueElement = requireValueElement(container);

            // 1. Plain text item
            dispatchClick(requireItem(container, "de"));
            flushSync();
            expect(valueElement.textContent?.trim()).toBe("Germany");
            expect(requireItem(container, "de").dataset.label).toBe("Germany");

            // 2. Explicit label overrides children text
            dispatchClick(requireItem(container, "fr"));
            flushSync();
            expect(valueElement.textContent?.trim()).toBe("France (Canonical)");
            expect(requireItem(container, "fr").dataset.label).toBe("France (Canonical)");

            // 3. SelectItemText + SelectItemDescription -> description must NOT leak into SelectValue or data-label
            dispatchClick(requireItem(container, "pro"));
            flushSync();
            expect(valueElement.textContent?.trim()).toBe("Pro Plan");
            expect(valueElement.textContent).not.toContain("priority support");
            expect(requireItem(container, "pro").dataset.label).toBe("Pro Plan");

            // 4. Plain text + SelectItemDescription -> description must NOT leak into SelectValue or data-label
            dispatchClick(requireItem(container, "raw-desc"));
            flushSync();
            expect(valueElement.textContent?.trim()).toBe("Starter Plan");
            expect(valueElement.textContent).not.toContain("Hidden from trigger label");
            expect(requireItem(container, "raw-desc").dataset.label).toBe("Starter Plan");

            // 5. Empty item falls back to String(value)
            dispatchClick(requireItem(container, "fallback-only"));
            flushSync();
            expect(valueElement.textContent?.trim()).toBe("fallback-only");

            unmount(instance);
        });

        test("mirrors shorthand icon and compound SelectItemIcon (with color) into SelectValue and respects showIcon={false}", () => {
            const state = $state<{ value?: string; showIcon: boolean; items: TestSelectItem[] }>({
                showIcon: true,
                items: [
                    { value: "globe", text: "Global", icon: Globe },
                    {
                        value: "star",
                        text: "Featured",
                        childIcon: Star,
                        childIconColor: "#e11d48",
                        childIconClass: "custom-child-icon",
                        childIconAttrs: { "data-testid": "compound-icon" },
                    },
                    { value: "no-check", text: "No Check", hideIndicator: true },
                ],
            });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get valueShowIcon() {
                        return state.showIcon;
                    },
                    get items() {
                        return state.items;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);

            // Shorthand icon prop
            const globeItem = requireItem(container, "globe");
            const globeItemIcon = globeItem.querySelector<SVGElement>("svg.cs-select-item-icon");
            expect(globeItemIcon?.getAttribute("aria-hidden")).toBe("true");
            expect(globeItemIcon?.classList.contains("lucide-globe")).toBe(true);
            expect(globeItem.querySelector(".cs-select-item-check")).not.toBeNull();
            expect(requireItem(container, "no-check").querySelector(".cs-select-item-check")).toBeNull();

            dispatchClick(globeItem);
            flushSync();
            const mirroredGlobe = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(mirroredGlobe).not.toBeNull();
            expect(mirroredGlobe?.getAttribute("aria-hidden")).toBe("true");
            expect(mirroredGlobe?.classList.contains("lucide-globe")).toBe(true);
            expect(mirroredGlobe?.classList.contains("lucide-star")).toBe(false);
            expect(mirroredGlobe?.querySelector("circle")).not.toBeNull();

            // Compound SelectItemIcon with color — switching options swaps the SVG component
            const starItem = requireItem(container, "star");
            const starItemIcon = starItem.querySelector<SVGElement>('[data-testid="compound-icon"]');
            expect(starItemIcon?.classList.contains("cs-select-item-icon")).toBe(true);
            expect(starItemIcon?.classList.contains("custom-child-icon")).toBe(true);
            expect(starItemIcon?.classList.contains("lucide-star")).toBe(true);
            expect(starItemIcon?.getAttribute("stroke")).toBe("#e11d48");

            dispatchClick(starItem);
            flushSync();
            const mirroredStar = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(mirroredStar).not.toBeNull();
            expect(mirroredStar?.classList.contains("lucide-star")).toBe(true);
            expect(mirroredStar?.classList.contains("lucide-globe")).toBe(false);
            expect(mirroredStar?.querySelector("circle")).toBeNull();
            expect(mirroredStar?.querySelectorAll("path")).toHaveLength(1);
            expect(mirroredStar?.getAttribute("stroke")).toBe("#e11d48");

            // Switching back to shorthand icon swaps the trigger SVG back to Globe without stale Star stroke
            dispatchClick(globeItem);
            flushSync();
            const mirroredBackToGlobe = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(mirroredBackToGlobe).not.toBeNull();
            expect(mirroredBackToGlobe?.classList.contains("lucide-globe")).toBe(true);
            expect(mirroredBackToGlobe?.classList.contains("lucide-star")).toBe(false);
            expect(mirroredBackToGlobe?.querySelector("circle")).not.toBeNull();
            expect(mirroredBackToGlobe?.getAttribute("stroke")).not.toBe("#e11d48");

            // Selecting an item without an icon clears the mirrored trigger icon
            dispatchClick(requireItem(container, "no-check"));
            flushSync();
            expect(trigger.querySelector("svg.cs-select-trigger-icon")).toBeNull();

            // Dynamically changing the icon prop on a selected SelectItem updates both item and trigger icons
            dispatchClick(globeItem);
            flushSync();
            const [globeConfig] = state.items;
            if (!globeConfig) throw new Error("Expected globe item config");
            globeConfig.icon = Moon;
            flushSync();
            const updatedGlobeItemIcon = globeItem.querySelector<SVGElement>("svg.cs-select-item-icon");
            const updatedMirroredIcon = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(updatedGlobeItemIcon?.classList.contains("lucide-moon")).toBe(true);
            expect(updatedGlobeItemIcon?.classList.contains("lucide-globe")).toBe(false);
            expect(updatedMirroredIcon?.classList.contains("lucide-moon")).toBe(true);
            expect(updatedMirroredIcon?.classList.contains("lucide-globe")).toBe(false);
            expect(updatedMirroredIcon?.querySelector("circle")).toBeNull();

            // showIcon={false} suppresses mirrored trigger icon
            state.showIcon = false;
            flushSync();
            expect(trigger.querySelector("svg.cs-select-trigger-icon")).toBeNull();

            state.showIcon = true;
            flushSync();
            const restoredMirroredIcon = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(restoredMirroredIcon).not.toBeNull();
            expect(restoredMirroredIcon?.classList.contains("lucide-moon")).toBe(true);

            unmount(instance);
        });

        test("reactively updates item and mirrored trigger icons when compound SelectItemIcon icon and color mutate", () => {
            const state = $state<{ value: string; items: TestSelectItem[] }>({
                value: "star",
                items: [
                    {
                        value: "star",
                        text: "Featured",
                        childIcon: Star,
                        childIconColor: "#e11d48",
                    },
                    { value: "other", text: "Other", icon: Moon },
                ],
            });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get items() {
                        return state.items;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const starItem = requireItem(container, "star");

            // Initial compound SelectItemIcon state
            const initialItemIcon = starItem.querySelector<SVGElement>("svg.cs-select-item-icon");
            const initialTriggerIcon = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(initialItemIcon?.classList.contains("lucide-star")).toBe(true);
            expect(initialItemIcon?.getAttribute("stroke")).toBe("#e11d48");
            expect(initialTriggerIcon?.classList.contains("lucide-star")).toBe(true);
            expect(initialTriggerIcon?.querySelector("circle")).toBeNull();
            expect(initialTriggerIcon?.querySelectorAll("path")).toHaveLength(1);
            expect(initialTriggerIcon?.getAttribute("stroke")).toBe("#e11d48");

            // Mutate childIconColor only
            const [starConfig] = state.items;
            if (!starConfig) throw new Error("Expected star item config");
            starConfig.childIconColor = "#2563eb";
            flushSync();

            const recoloredItemIcon = starItem.querySelector<SVGElement>("svg.cs-select-item-icon");
            const recoloredTriggerIcon = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(recoloredItemIcon?.classList.contains("lucide-star")).toBe(true);
            expect(recoloredItemIcon?.getAttribute("stroke")).toBe("#2563eb");
            expect(recoloredTriggerIcon?.classList.contains("lucide-star")).toBe(true);
            expect(recoloredTriggerIcon?.getAttribute("stroke")).toBe("#2563eb");

            // Mutate childIcon to Globe while keeping color
            starConfig.childIcon = Globe;
            flushSync();

            const swappedItemIcon = starItem.querySelector<SVGElement>("svg.cs-select-item-icon");
            const swappedTriggerIcon = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(swappedItemIcon?.classList.contains("lucide-globe")).toBe(true);
            expect(swappedItemIcon?.classList.contains("lucide-star")).toBe(false);
            expect(swappedItemIcon?.querySelector("circle")).not.toBeNull();
            expect(swappedItemIcon?.getAttribute("stroke")).toBe("#2563eb");
            expect(swappedTriggerIcon?.classList.contains("lucide-globe")).toBe(true);
            expect(swappedTriggerIcon?.classList.contains("lucide-star")).toBe(false);
            expect(swappedTriggerIcon?.querySelector("circle")).not.toBeNull();
            expect(swappedTriggerIcon?.getAttribute("stroke")).toBe("#2563eb");

            // Clear childIconColor -> removes stale stroke on both item and mirrored trigger icons
            starConfig.childIconColor = undefined;
            flushSync();

            const clearedItemIcon = starItem.querySelector<SVGElement>("svg.cs-select-item-icon");
            const clearedTriggerIcon = trigger.querySelector<SVGElement>("svg.cs-select-trigger-icon");
            expect(clearedItemIcon?.classList.contains("lucide-globe")).toBe(true);
            expect(clearedItemIcon?.getAttribute("stroke")).not.toBe("#2563eb");
            expect(clearedItemIcon?.getAttribute("stroke")).toBe("currentColor");
            expect(clearedTriggerIcon?.classList.contains("lucide-globe")).toBe(true);
            expect(clearedTriggerIcon?.getAttribute("stroke")).not.toBe("#2563eb");
            expect(clearedTriggerIcon?.getAttribute("stroke")).toBe("currentColor");

            unmount(instance);
        });

        test("bind:value, onValueChange idempotency, and strict controlled mode stay synchronized across interactions", () => {
            const state = $state<{ value?: string; open: boolean }>({
                value: "de",
                open: true,
            });
            const onValueChange = vi.fn<(next: string) => void>();

            const instance = mount(SelectTestHost, {
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
                    onValueChange,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            expect(requireItem(container, "de").getAttribute("aria-selected")).toBe("true");
            expect("selected" in requireItem(container, "de").dataset).toBe(true);
            expect(requireItem(container, "fr").getAttribute("aria-selected")).toBe("false");

            // Clicking already-selected item closes popover without re-firing onValueChange
            dispatchClick(requireItem(container, "de"));
            flushSync();
            expect(state.open).toBe(false);
            expect(state.value).toBe("de");
            expect(onValueChange).not.toHaveBeenCalled();

            // Re-open and select new item
            state.open = true;
            flushSync();
            dispatchClick(requireItem(container, "fr"));
            flushSync();
            expect(state.open).toBe(false);
            expect(state.value).toBe("fr");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("fr");
            expect(requireItem(container, "de").getAttribute("aria-selected")).toBe("false");
            expect(requireItem(container, "fr").getAttribute("aria-selected")).toBe("true");
            expect(requireValueElement(container).textContent?.trim()).toBe("France");
            expect(document.activeElement).toBe(trigger);

            unmount(instance);

            // Strict controlled rejection mode: parent refuses setter update
            const controlledState = $state({ value: "de" });
            const controlledOnValueChange = vi.fn<(next: string) => void>();
            const controlledInstance = mount(SelectTestHost, {
                target: container,
                props: {
                    get value() {
                        return controlledState.value;
                    },
                    set value(_next) {
                        // Intentionally reject direct binding mutation
                    },
                    onValueChange: controlledOnValueChange,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            dispatchClick(requireItem(container, "es"));
            flushSync();
            expect(controlledOnValueChange).toHaveBeenCalledTimes(1);
            expect(controlledOnValueChange).toHaveBeenCalledWith("es");
            expect(requireItem(container, "de").getAttribute("aria-selected")).toBe("true");
            expect(requireItem(container, "es").getAttribute("aria-selected")).toBe("false");
            expect(requireValueElement(container).textContent?.trim()).toBe("Germany");

            // Parent later updates controlledState.value -> DOM syncs cleanly
            controlledState.value = "es";
            flushSync();
            expect(requireItem(container, "de").getAttribute("aria-selected")).toBe("false");
            expect(requireItem(container, "es").getAttribute("aria-selected")).toBe("true");
            expect(requireValueElement(container).textContent?.trim()).toBe("Spain");

            unmount(controlledInstance);
        });
    });

    describe("Open/Close Lifecycle & Keyboard Navigation", () => {
        test("strict controlled bind:open rejection stays synchronized across keyboard, selection, and native toggle", () => {
            // 1. Reject open (controlledOpen = false)
            const openRejectionState = $state({ open: false });
            const openRejectionSpy = vi.fn<(next: boolean) => void>();

            const openRejectionInstance = mount(SelectTestHost, {
                target: container,
                props: {
                    get open() {
                        return openRejectionState.open;
                    },
                    set open(_next) {
                        // Intentionally reject direct binding mutation
                    },
                    onOpenChange: openRejectionSpy,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const openRejectTrigger = requireTrigger(container);
            const openRejectContent = requireContent(container);

            // Keyboard open attempts (ArrowDown and Enter)
            openRejectTrigger.focus();
            dispatchKeyDown(openRejectTrigger, "ArrowDown");
            flushSync();
            expect(openRejectionSpy).toHaveBeenCalledTimes(1);
            expect(openRejectionSpy).toHaveBeenLastCalledWith(true);
            expect(openRejectContent.matches(":popover-open")).toBe(false);
            expect(openRejectTrigger.getAttribute("aria-expanded")).toBe("false");
            expect(openRejectTrigger.dataset.state).toBe("closed");

            openRejectionSpy.mockClear();
            dispatchKeyDown(openRejectTrigger, "Enter");
            flushSync();
            expect(openRejectionSpy).toHaveBeenCalledTimes(1);
            expect(openRejectionSpy).toHaveBeenLastCalledWith(true);
            expect(openRejectContent.matches(":popover-open")).toBe(false);
            expect(openRejectTrigger.getAttribute("aria-expanded")).toBe("false");
            expect(openRejectTrigger.dataset.state).toBe("closed");

            // Native toggle open (content.showPopover())
            openRejectionSpy.mockClear();
            openRejectContent.showPopover();
            flushSync();
            expect(openRejectionSpy).toHaveBeenCalledTimes(1);
            expect(openRejectionSpy).toHaveBeenLastCalledWith(true);
            expect(openRejectContent.matches(":popover-open")).toBe(false);
            expect(openRejectTrigger.getAttribute("aria-expanded")).toBe("false");
            expect(openRejectTrigger.dataset.state).toBe("closed");

            // Once consumer flips controlledOpen = true, normal sync works
            openRejectionSpy.mockClear();
            openRejectionState.open = true;
            flushSync();
            expect(openRejectContent.matches(":popover-open")).toBe(true);
            expect(openRejectTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(openRejectTrigger.dataset.state).toBe("open");
            expect(openRejectionSpy).not.toHaveBeenCalled();

            unmount(openRejectionInstance);

            // 2. Reject close (controlledOpen = true)
            const closeRejectionState = $state<{ open: boolean; value?: string }>({ open: true, value: "de" });
            const closeRejectionSpy = vi.fn<(next: boolean) => void>();

            const closeRejectionInstance = mount(SelectTestHost, {
                target: container,
                props: {
                    get value() {
                        return closeRejectionState.value;
                    },
                    set value(next) {
                        closeRejectionState.value = next;
                    },
                    get open() {
                        return closeRejectionState.open;
                    },
                    set open(_next) {
                        // Intentionally reject direct binding mutation
                    },
                    onOpenChange: closeRejectionSpy,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const closeRejectTrigger = requireTrigger(container);
            const closeRejectContent = requireContent(container);
            expect(closeRejectContent.matches(":popover-open")).toBe(true);
            expect(closeRejectTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(closeRejectTrigger.dataset.state).toBe("open");

            // Selecting an item attempts close -> rejected
            dispatchClick(requireItem(container, "fr"));
            flushSync();
            expect(closeRejectionSpy).toHaveBeenCalledTimes(1);
            expect(closeRejectionSpy).toHaveBeenLastCalledWith(false);
            expect(closeRejectionState.value).toBe("fr");
            expect(closeRejectContent.matches(":popover-open")).toBe(true);
            expect(closeRejectTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(closeRejectTrigger.dataset.state).toBe("open");

            // Pressing Escape on trigger attempts close -> rejected
            closeRejectionSpy.mockClear();
            closeRejectTrigger.focus();
            dispatchKeyDown(closeRejectTrigger, "Escape");
            flushSync();
            expect(closeRejectionSpy).toHaveBeenCalledTimes(1);
            expect(closeRejectionSpy).toHaveBeenLastCalledWith(false);
            expect(closeRejectContent.matches(":popover-open")).toBe(true);
            expect(closeRejectTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(closeRejectTrigger.dataset.state).toBe("open");

            // Native light-dismiss attempts close -> onOpenChange fires once and syncPopoverOpen re-opens DOM popover
            closeRejectionSpy.mockClear();
            openPopovers.delete(closeRejectContent);
            dispatchToggleEvent(closeRejectContent, "closed", "open");
            flushSync();
            expect(closeRejectionSpy).toHaveBeenCalledTimes(1);
            expect(closeRejectionSpy).toHaveBeenLastCalledWith(false);
            expect(closeRejectContent.matches(":popover-open")).toBe(true);
            expect(closeRejectTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(closeRejectTrigger.dataset.state).toBe("open");

            // Once consumer flips controlledOpen = false, normal sync closes DOM popover cleanly
            closeRejectionSpy.mockClear();
            closeRejectionState.open = false;
            flushSync();
            expect(closeRejectContent.matches(":popover-open")).toBe(false);
            expect(closeRejectTrigger.getAttribute("aria-expanded")).toBe("false");
            expect(closeRejectTrigger.dataset.state).toBe("closed");
            expect(closeRejectionSpy).not.toHaveBeenCalled();

            unmount(closeRejectionInstance);
        });

        test("ArrowDown, ArrowUp, Enter, and Space on SelectTrigger open popover and focus initial item", () => {
            const state = $state<{ value?: string; open: boolean }>({
                open: false,
            });
            const onOpenChange = vi.fn<(next: boolean) => void>();

            const instance = mount(SelectTestHost, {
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
                    onOpenChange,
                    items: [
                        { value: "disabled-first", plainText: "Alpha", disabled: true },
                        { value: "b", plainText: "Beta" },
                        { value: "c", plainText: "Gamma" },
                        { value: "d", plainText: "Delta" },
                        { value: "disabled-last", plainText: "Omega", disabled: true },
                    ],
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const itemB = requireItem(container, "b");
            const itemC = requireItem(container, "c");
            const itemBScrollSpy = vi.spyOn(itemB, "scrollIntoView");
            const itemCScrollSpy = vi.spyOn(itemC, "scrollIntoView");
            trigger.focus();

            // ArrowDown with no selection focuses first enabled item ("b") and scrolls it into view
            const downEvent = dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            expect(downEvent.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);
            expect(document.activeElement).toBe(itemB);
            expect(itemBScrollSpy).toHaveBeenCalledTimes(1);
            expect(itemBScrollSpy).toHaveBeenCalledWith({ block: "nearest" });
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);

            // Escape on trigger while open closes and restores focus to trigger
            trigger.focus();
            dispatchKeyDown(trigger, "Escape");
            flushSync();
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // ArrowUp with no selection focuses last enabled item ("d")
            dispatchKeyDown(trigger, "ArrowUp");
            flushSync();
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(requireItem(container, "d"));

            state.open = false;
            flushSync();
            trigger.focus();

            // Enter opens and focuses first enabled item when unselected
            dispatchKeyDown(trigger, "Enter");
            flushSync();
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(requireItem(container, "b"));

            state.open = false;
            flushSync();
            trigger.focus();

            // Space opens and suppresses Space keyup default action
            const spaceDown = dispatchKeyDown(trigger, " ");
            flushSync();
            expect(spaceDown.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(requireItem(container, "b"));

            const spaceUp = dispatchKeyUp(trigger, " ");
            expect(spaceUp.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);

            // When a value IS selected, ArrowDown and ArrowUp both focus [aria-selected="true"]
            state.open = false;
            state.value = "c";
            flushSync();
            trigger.focus();

            dispatchKeyDown(trigger, "ArrowUp");
            flushSync();
            expect(document.activeElement).toBe(requireItem(container, "c"));

            state.open = false;
            flushSync();
            trigger.focus();

            dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(itemC);
            expect(itemCScrollSpy).toHaveBeenCalledWith({ block: "nearest" });

            unmount(instance);
        });

        test("ArrowDown/ArrowUp/Home/End clamp at edges, skip disabled items, and manage data-arrow-nav + data-nav", () => {
            const state = $state({ open: true });

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    items: [
                        { value: "first", plainText: "First" },
                        { value: "blocked", plainText: "Blocked", disabled: true },
                        { value: "middle", plainText: "Middle" },
                        { value: "last", plainText: "Last" },
                    ],
                },
            });
            flushSync();

            const content = requireContent(container);
            const listViewport = requireListViewport(container);
            const firstItem = requireItem(container, "first");
            const middleItem = requireItem(container, "middle");
            const lastItem = requireItem(container, "last");
            const middleScrollSpy = vi.spyOn(middleItem, "scrollIntoView");
            const lastScrollSpy = vi.spyOn(lastItem, "scrollIntoView");

            expect(document.activeElement).toBe(firstItem);
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);

            // ArrowDown skips disabled "blocked" -> lands on "middle", sets data-arrow-nav + data-nav="keyboard", and scrolls into view
            dispatchKeyDown(firstItem, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(middleItem);
            expect(middleScrollSpy).toHaveBeenCalledTimes(1);
            expect(middleScrollSpy).toHaveBeenCalledWith({ block: "nearest" });
            expect("arrowNav" in content.dataset).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");

            // End -> lands on "last" and scrolls into view
            dispatchKeyDown(middleItem, "End");
            flushSync();
            expect(document.activeElement).toBe(lastItem);
            expect(lastScrollSpy).toHaveBeenCalledTimes(1);
            expect(lastScrollSpy).toHaveBeenCalledWith({ block: "nearest" });

            // ArrowDown at last clamps (loop: false)
            dispatchKeyDown(lastItem, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(lastItem);
            expect(lastScrollSpy).toHaveBeenCalledTimes(1);

            // Home -> lands on "first"
            dispatchKeyDown(lastItem, "Home");
            flushSync();
            expect(document.activeElement).toBe(firstItem);

            // ArrowUp at first clamps (loop: false)
            dispatchKeyDown(firstItem, "ArrowUp");
            flushSync();
            expect(document.activeElement).toBe(firstItem);

            // Non-mouse pointermove does NOT clear data-nav / data-arrow-nav
            dispatchPointerEvent(content, "pointermove", { pointerType: "touch" });
            flushSync();
            expect("arrowNav" in content.dataset).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");

            // Mouse pointermove clears data-nav / data-arrow-nav and moves focus to list viewport
            dispatchPointerEvent(content, "pointermove", { pointerType: "mouse" });
            flushSync();
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);
            expect(document.activeElement).toBe(listViewport);

            // ArrowDown from listViewport restores keyboard nav & focus onto middle
            dispatchKeyDown(listViewport, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(middleItem);
            expect("arrowNav" in content.dataset).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");

            // focusout between items inside content preserves nav flags; leaving content clears them
            middleItem.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: lastItem }));
            flushSync();
            expect("arrowNav" in content.dataset).toBe(true);

            const outsideButton = document.createElement("button");
            document.body.append(outsideButton);
            middleItem.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideButton }));
            flushSync();
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);
            outsideButton.remove();

            // Re-enable via ArrowUp, then clear via pointerdown on content
            dispatchKeyDown(middleItem, "ArrowUp");
            flushSync();
            expect("arrowNav" in content.dataset).toBe(true);

            dispatchPointerEvent(content, "pointerdown");
            flushSync();
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);

            // Re-enable via ArrowDown, then closing popover clears nav flags
            dispatchKeyDown(firstItem, "ArrowDown");
            flushSync();
            expect("arrowNav" in content.dataset).toBe(true);
            state.open = false;
            flushSync();
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);

            unmount(instance);
        });

        test("open-menu typeahead focuses matching enabled item, cycles same-char, resets after timeout, and ignores modifiers", () => {
            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    open: true,
                    items: [
                        { value: "apricot", plainText: "Apricot" },
                        { value: "banana-disabled", plainText: "Banana", disabled: true },
                        { value: "belgium", plainText: "Belgium" },
                        { value: "belize", plainText: "Belize" },
                        { value: "uk", label: "United Kingdom", plainText: "UK" },
                        { value: "us", label: "United States", plainText: "US" },
                    ],
                },
            });
            flushSync();

            const content = requireContent(container);
            const apricot = requireItem(container, "apricot");
            const belgium = requireItem(container, "belgium");
            const belize = requireItem(container, "belize");
            const uk = requireItem(container, "uk");
            const us = requireItem(container, "us");

            expect(document.activeElement).toBe(apricot);

            // Modifier keys are ignored
            dispatchKeyDown(apricot, "b", { ctrlKey: true });
            flushSync();
            expect(document.activeElement).toBe(apricot);

            // Single char "b" skips disabled "Banana" and lands on "Belgium"
            dispatchKeyDown(apricot, "b");
            flushSync();
            expect(document.activeElement).toBe(belgium);
            expect("arrowNav" in content.dataset).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");

            // Wait out 500ms typeahead timeout and reset to Apricot
            vi.advanceTimersByTime(500);
            dispatchKeyDown(belgium, "a");
            flushSync();
            expect(document.activeElement).toBe(apricot);
            vi.advanceTimersByTime(500);

            // Multi-char prefix "beli" narrows from "Belgium" to "Belize"
            dispatchKeyDown(apricot, "b");
            flushSync();
            expect(document.activeElement).toBe(belgium);
            dispatchKeyDown(belgium, "e");
            dispatchKeyDown(belgium, "l");
            dispatchKeyDown(belgium, "i");
            flushSync();
            expect(document.activeElement).toBe(belize);

            vi.advanceTimersByTime(500);

            // Repeated same-char "u" cycles between "United Kingdom" and "United States"
            dispatchKeyDown(belize, "u");
            flushSync();
            expect(document.activeElement).toBe(uk);
            dispatchKeyDown(uk, "u");
            flushSync();
            expect(document.activeElement).toBe(us);

            unmount(instance);
        });

        test("open-menu multi-word typeahead supports Space mid-query, prevents Space selection on unmatched queries, and restores Space selection after 500ms timeout", () => {
            const state = $state<{ value?: string; open: boolean }>({
                open: true,
            });
            const onValueChange = vi.fn<(next: string) => void>();

            const instance = mount(SelectTestHost, {
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
                    onValueChange,
                    items: [
                        { value: "la", plainText: "Los Angeles" },
                        { value: "nd", plainText: "New Delhi" },
                        { value: "ny", plainText: "New York" },
                    ],
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const la = requireItem(container, "la");
            const nd = requireItem(container, "nd");
            const ny = requireItem(container, "ny");

            expect(document.activeElement).toBe(la);

            // Typing "n", "e", "w", " ", "y" matches "New York" without selecting/closing "New Delhi" on " "
            dispatchKeyDown(la, "n");
            flushSync();
            expect(document.activeElement).toBe(nd);

            dispatchKeyDown(nd, "e");
            dispatchKeyDown(nd, "w");
            flushSync();
            expect(document.activeElement).toBe(nd);

            const midSpace = dispatchKeyDown(nd, " ");
            flushSync();
            expect(midSpace.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(state.value).toBeUndefined();
            expect(onValueChange).not.toHaveBeenCalled();
            expect(document.activeElement).toBe(nd);

            dispatchKeyDown(nd, "y");
            flushSync();
            expect(document.activeElement).toBe(ny);
            expect(state.open).toBe(true);
            expect(state.value).toBeUndefined();

            vi.advanceTimersByTime(500);

            // Typing "n", "e", "w", " ", "z", " " calls preventDefault() and keeps menu open without selecting
            dispatchKeyDown(ny, "n");
            flushSync();
            expect(document.activeElement).toBe(nd);

            dispatchKeyDown(nd, "e");
            dispatchKeyDown(nd, "w");
            dispatchKeyDown(nd, " ");
            dispatchKeyDown(nd, "z");
            const trailingSpace = dispatchKeyDown(nd, " ");
            flushSync();
            expect(trailingSpace.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(state.value).toBeUndefined();
            expect(onValueChange).not.toHaveBeenCalled();

            // Waiting 500ms until buffer expires, then pressing " " selects the focused item and closes
            vi.advanceTimersByTime(500);
            const selectSpace = dispatchKeyDown(nd, " ");
            flushSync();
            expect(selectSpace.defaultPrevented).toBe(true);
            expect(state.value).toBe("nd");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith("nd");
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(document.activeElement).toBe(trigger);

            unmount(instance);
        });

        test("closed-trigger typeahead selects matching enabled item without opening, skips disabled, and ignores modifiers", () => {
            const state = $state<{ value?: string; open: boolean }>({
                open: false,
            });
            const onValueChange = vi.fn<(next: string) => void>();

            const instance = mount(SelectTestHost, {
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
                    onValueChange,
                    items: [
                        { value: "banana-disabled", plainText: "Banana", disabled: true },
                        { value: "blackberry", plainText: "Blackberry" },
                        { value: "uk", label: "United Kingdom", plainText: "UK" },
                        { value: "us", label: "United States", plainText: "US" },
                    ],
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            trigger.focus();

            // Modifiers and composing events are ignored
            dispatchKeyDown(trigger, "b", { metaKey: true });
            dispatchKeyDown(trigger, "b", { altKey: true });
            dispatchKeyDown(trigger, "b", { isComposing: true });
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(false);

            // "b" skips disabled "Banana" and selects "Blackberry" without opening
            dispatchKeyDown(trigger, "b");
            flushSync();
            expect(state.value).toBe("blackberry");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("blackberry");
            expect(state.open).toBe(false);

            vi.advanceTimersByTime(500);

            // Multi-char query including Space mid-buffer ("u" -> "uk", then "united s" -> "us")
            for (const character of "united s") {
                dispatchKeyDown(trigger, character);
            }
            flushSync();
            expect(state.value).toBe("us");
            expect(state.open).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(3);
            expect(onValueChange).toHaveBeenNthCalledWith(2, "uk");
            expect(onValueChange).toHaveBeenNthCalledWith(3, "us");

            vi.advanceTimersByTime(500);

            // Repeated same-char "u" cycles from "us" -> "uk" -> "us"
            dispatchKeyDown(trigger, "u");
            flushSync();
            expect(state.value).toBe("uk");
            dispatchKeyDown(trigger, "u");
            flushSync();
            expect(state.value).toBe("us");

            // Opening via ArrowDown clears typeahead buffer so subsequent Space works normally when re-closed
            dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            expect(state.open).toBe(true);

            unmount(instance);
        });

        test("Enter and Space inside open menu select focused item, close popover, and restore focus to trigger", () => {
            const state = $state<{ value?: string; open: boolean }>({
                open: true,
            });
            const onValueChange = vi.fn<(next: string) => void>();
            const preventEnter = vi.fn((event: KeyboardEvent) => event.preventDefault());

            const instance = mount(SelectTestHost, {
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
                    onValueChange,
                    items: [
                        { value: "de", plainText: "Germany" },
                        { value: "fr", plainText: "France" },
                        { value: "guarded", plainText: "Guarded", onkeydown: preventEnter },
                    ],
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            // Navigate to France and select with Enter
            dispatchKeyDown(requireItem(container, "de"), "ArrowDown");
            flushSync();
            const frenchItem = requireItem(container, "fr");
            expect(document.activeElement).toBe(frenchItem);

            dispatchKeyDown(frenchItem, "Enter");
            flushSync();
            expect(state.value).toBe("fr");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // Re-open, navigate to Germany, and select with Space
            dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            dispatchKeyDown(requireItem(container, "fr"), "ArrowUp");
            flushSync();
            const germanItem = requireItem(container, "de");
            expect(document.activeElement).toBe(germanItem);

            dispatchKeyDown(germanItem, " ");
            flushSync();
            expect(state.value).toBe("de");
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // Item onkeydown preventDefault() blocks selection
            state.open = true;
            flushSync();
            const guardedItem = requireItem(container, "guarded");
            guardedItem.focus();
            dispatchKeyDown(guardedItem, "Enter");
            flushSync();
            expect(preventEnter).toHaveBeenCalledTimes(1);
            expect(state.value).toBe("de");
            expect(state.open).toBe(true);

            unmount(instance);
        });

        test("Tab and Shift+Tab inside open menu close popover and focus SelectTrigger synchronously without preventDefault", () => {
            const state = $state({ open: true });
            const onOpenChange = vi.fn<(next: boolean) => void>();

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
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

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const firstItem = requireItem(container, "de");
            expect(document.activeElement).toBe(firstItem);

            const tabEvent = dispatchKeyDown(firstItem, "Tab");
            expect(tabEvent.defaultPrevented).toBe(false);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(document.activeElement).toBe(trigger);
            expect(onOpenChange).toHaveBeenCalledWith(false);

            // Re-open and verify Shift+Tab behaves identically
            state.open = true;
            flushSync();
            const activeItem = requireItem(container, "de");
            expect(document.activeElement).toBe(activeItem);

            const shiftTabEvent = dispatchKeyDown(activeItem, "Tab", { shiftKey: true });
            expect(shiftTabEvent.defaultPrevented).toBe(false);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(document.activeElement).toBe(trigger);

            unmount(instance);
        });

        test("disabled Select ignores keyboard open, external open=true, and closed typeahead", () => {
            const state = $state<{ value?: string; open: boolean }>({
                value: "de",
                open: false,
            });
            const onOpenChange = vi.fn<(next: boolean) => void>();
            const onValueChange = vi.fn<(next: string) => void>();

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    disabled: true,
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
                    onOpenChange,
                    onValueChange,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            for (const key of ["ArrowDown", "ArrowUp", "Enter", " ", "f"]) {
                dispatchKeyDown(trigger, key);
            }
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();

            expect(state.open).toBe(false);
            expect(state.value).toBe("de");
            expect(content.matches(":popover-open")).toBe(false);
            expect(onOpenChange).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();

            // External open=true while disabled snaps back to false
            state.open = true;
            flushSync();
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);

            // Native toggle open while disabled hides immediately
            content.showPopover();
            flushSync();
            expect(content.matches(":popover-open")).toBe(false);
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("triggerDisabled={true} while Select.disabled={false} blocks keyboard open, closed typeahead, and pointerdown", () => {
            const state = $state<{ value?: string; open: boolean }>({
                value: "de",
                open: false,
            });
            const onOpenChange = vi.fn<(next: boolean) => void>();
            const onValueChange = vi.fn<(next: string) => void>();

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    disabled: false,
                    triggerDisabled: true,
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
                    onOpenChange,
                    onValueChange,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            expect(trigger.disabled).toBe(true);
            expect("disabled" in trigger.dataset).toBe(true);
            expect(trigger.hasAttribute("popovertarget")).toBe(false);

            for (const key of ["ArrowDown", "ArrowUp", "Enter", " ", "f"]) {
                const keyEvent = dispatchKeyDown(trigger, key);
                expect(keyEvent.defaultPrevented).toBe(false);
            }
            dispatchPointerEvent(trigger, "pointerdown");
            dispatchClick(trigger);
            flushSync();

            expect(state.open).toBe(false);
            expect(state.value).toBe("de");
            expect(content.matches(":popover-open")).toBe(false);
            expect(onOpenChange).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("dynamically setting disabled={true} while open closes popover, sets open=false, and fires onOpenChange(false)", () => {
            const state = $state({ disabled: false, open: true });
            const onOpenChange = vi.fn<(next: boolean) => void>();

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get disabled() {
                        return state.disabled;
                    },
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

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            onOpenChange.mockClear();

            state.disabled = true;
            flushSync();

            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenCalledWith(false);

            unmount(instance);
        });

        test("native light-dismiss toggle close syncs open=false, fires onOpenChange(false), sets aria-expanded='false', and clears nav flags", () => {
            const state = $state({ open: true });
            const onOpenChange = vi.fn<(next: boolean) => void>();

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
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

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const firstItem = requireItem(container, "de");

            expect(state.open).toBe(true);
            expect(trigger.getAttribute("aria-expanded")).toBe("true");
            onOpenChange.mockClear();

            // Activate keyboard nav flags before native light-dismiss
            dispatchKeyDown(firstItem, "ArrowDown");
            flushSync();
            expect("arrowNav" in content.dataset).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");

            openPopovers.delete(content);
            dispatchToggleEvent(content, "closed", "open");
            flushSync();

            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenCalledWith(false);
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect(trigger.dataset.state).toBe("closed");
            expect("arrowNav" in content.dataset).toBe(false);
            expect("nav" in content.dataset).toBe(false);

            unmount(instance);
        });
    });

    describe("Pointer & Press-Drag-Release", () => {
        test("clicking trigger toggles popover, clicking item selects & closes, and disabled item does nothing", () => {
            const state = $state<{ value?: string; open: boolean }>({
                open: false,
            });
            const onValueChange = vi.fn<(next: string) => void>();
            const preventItemClick = vi.fn((event: MouseEvent) => event.preventDefault());

            const instance = mount(SelectTestHost, {
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
                    onValueChange,
                    items: [
                        { value: "de", plainText: "Germany" },
                        { value: "fr", plainText: "France", disabled: true },
                        { value: "es", plainText: "Spain", onclick: preventItemClick },
                    ],
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            // Primary mouse pointerdown opens immediately and suppresses subsequent click
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 20, clientY: 20 });
            const suppressedClick = dispatchClick(trigger);
            flushSync();
            expect(suppressedClick.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            // Clicking disabled item does nothing
            dispatchClick(requireItem(container, "fr"));
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);
            expect(onValueChange).not.toHaveBeenCalled();

            // Item onclick preventDefault() blocks selection
            dispatchClick(requireItem(container, "es"));
            flushSync();
            expect(preventItemClick).toHaveBeenCalledTimes(1);
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);

            // Clicking enabled item selects, closes, and restores focus to trigger
            dispatchClick(requireItem(container, "de"));
            flushSync();
            expect(state.value).toBe("de");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // Re-opening and pressing pointerdown on trigger again toggles closed
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 20, clientY: 20 });
            flushSync();
            expect(state.open).toBe(true);
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 20, clientY: 20 });
            flushSync();
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("touch open flow does not open on pointerdown and opens cleanly on subsequent click", () => {
            const state = $state({ open: false });
            const onOpenChange = vi.fn<(next: boolean) => void>();

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
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

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            dispatchPointerEvent(trigger, "pointerdown", { pointerType: "touch" });
            flushSync();
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(onOpenChange).not.toHaveBeenCalled();

            const touchClick = dispatchClick(trigger);
            flushSync();
            expect(touchClick.defaultPrevented).toBe(false);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);
            expect(document.activeElement).toBe(requireItem(container, "de"));

            unmount(instance);
        });

        test("mouse press-drag-release commits when moved >= 4px or held >= 180ms, and guards short/touch/trigger/window releases", () => {
            const state = $state<{ value?: string; open: boolean }>({
                open: false,
            });
            const onValueChange = vi.fn<(next: string) => void>();

            const instance = mount(SelectTestHost, {
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
                    onValueChange,
                    items: [
                        { value: "de", plainText: "Germany" },
                        { value: "fr", plainText: "France" },
                        { value: "blocked", plainText: "Blocked", disabled: true },
                    ],
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const germanItem = requireItem(container, "de");
            const frenchItem = requireItem(container, "fr");
            const blockedItem = requireItem(container, "blocked");

            // 1. Immediate release with < 4px movement and < 180ms hold does NOT commit
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 50, clientY: 50 });
            flushSync();
            expect(state.open).toBe(true);
            dispatchPointerEvent(germanItem, "pointerup", { clientX: 51, clientY: 51 });
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);

            // 2. Window pointerup cleared drag state, so a delayed pointerup on an item does NOT commit
            vi.advanceTimersByTime(250);
            dispatchPointerEvent(germanItem, "pointerup", { clientX: 120, clientY: 120 });
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);

            // Close and start fresh drag-release via distance >= 4px
            state.open = false;
            flushSync();
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 50, clientY: 50 });
            flushSync();
            expect(state.open).toBe(true);

            // Non-mouse or non-primary button or release on trigger itself does NOT commit
            dispatchPointerEvent(germanItem, "pointerup", { pointerType: "touch", clientX: 100, clientY: 100 });
            dispatchPointerEvent(germanItem, "pointerup", { button: 2, clientX: 100, clientY: 100 });
            dispatchPointerEvent(trigger, "pointerup", { clientX: 100, clientY: 100 });
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);

            // Re-open drag because window pointerup above cleared pointerDragActive
            state.open = false;
            flushSync();
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 50, clientY: 50 });
            flushSync();

            // Releasing on disabled item does NOT commit
            dispatchPointerEvent(blockedItem, "pointerup", { clientX: 100, clientY: 100 });
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);

            // Start drag and release on enabled item with distance >= 4px -> commits and closes
            state.open = false;
            flushSync();
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 50, clientY: 50 });
            flushSync();
            dispatchPointerEvent(germanItem, "pointerup", { clientX: 50, clientY: 56 });
            flushSync();
            expect(state.value).toBe("de");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // 3. Hold >= 180ms with zero pointer movement -> commits and closes
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 50, clientY: 50 });
            flushSync();
            vi.advanceTimersByTime(180);
            dispatchPointerEvent(frenchItem, "pointerup", { clientX: 50, clientY: 50 });
            flushSync();
            expect(state.value).toBe("fr");
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(state.open).toBe(false);

            unmount(instance);
        });
    });

    describe("ref = $bindable() & {...rest} forwarding", () => {
        test("binds refs and forwards custom classes and rest attributes on all DOM-rendering subcomponents", () => {
            let triggerRef: HTMLButtonElement | null = null;
            let valueRef: HTMLSpanElement | null = null;
            let contentRef: HTMLDivElement | null = null;
            let groupRef: HTMLDivElement | null = null;
            let groupLabelRef: HTMLDivElement | null = null;
            let itemRef: HTMLDivElement | null = null;
            let itemTextRef: HTMLSpanElement | null = null;
            let itemDescriptionRef: HTMLParagraphElement | null = null;
            let separatorRef: HTMLDivElement | null = null;

            const instance = mount(SelectTestHost, {
                target: container,
                props: {
                    get triggerRef() {
                        return triggerRef;
                    },
                    set triggerRef(element) {
                        triggerRef = element;
                    },
                    triggerClass: "custom-trigger-cls",
                    triggerAttrs: { "data-testid": "sel-trigger" },

                    get valueRef() {
                        return valueRef;
                    },
                    set valueRef(element) {
                        valueRef = element;
                    },
                    valueClass: "custom-value-cls",
                    valueAttrs: { "data-testid": "sel-value" },

                    get contentRef() {
                        return contentRef;
                    },
                    set contentRef(element) {
                        contentRef = element;
                    },
                    contentClass: "custom-content-cls",
                    contentAttrs: { "data-testid": "sel-content" },

                    get groupRef() {
                        return groupRef;
                    },
                    set groupRef(element) {
                        groupRef = element;
                    },
                    get groupLabelRef() {
                        return groupLabelRef;
                    },
                    set groupLabelRef(element) {
                        groupLabelRef = element;
                    },
                    get itemRef() {
                        return itemRef;
                    },
                    set itemRef(element) {
                        itemRef = element;
                    },
                    get itemTextRef() {
                        return itemTextRef;
                    },
                    set itemTextRef(element) {
                        itemTextRef = element;
                    },
                    get itemDescriptionRef() {
                        return itemDescriptionRef;
                    },
                    set itemDescriptionRef(element) {
                        itemDescriptionRef = element;
                    },
                    get separatorRef() {
                        return separatorRef;
                    },
                    set separatorRef(element) {
                        separatorRef = element;
                    },

                    showSeparator: true,
                    separatorClass: "custom-sep-cls",
                    separatorAttrs: { "data-testid": "sel-separator" },

                    groups: [
                        {
                            key: "g1",
                            label: "Group 1",
                            labelClass: "custom-glabel-cls",
                            labelAttrs: { "data-testid": "sel-group-label" },
                            class: "custom-group-cls",
                            attrs: { "data-testid": "sel-group" },
                            bindRef: true,
                            items: [
                                {
                                    value: "one",
                                    text: "Item One",
                                    description: "First item description",
                                    class: "custom-item-cls",
                                    attrs: { "data-testid": "sel-item" },
                                    textClass: "custom-text-cls",
                                    textAttrs: { "data-testid": "sel-item-text" },
                                    descriptionClass: "custom-desc-cls",
                                    descriptionAttrs: { "data-testid": "sel-item-desc" },
                                    bindRef: true,
                                },
                            ],
                        },
                        {
                            key: "g2",
                            label: "Group 2",
                            items: [{ value: "two", plainText: "Item Two" }],
                        },
                    ],
                },
            });
            flushSync();

            const trigger = requireElement<HTMLButtonElement>(container, '[data-testid="sel-trigger"]');
            const valueElement = requireElement<HTMLSpanElement>(container, '[data-testid="sel-value"]');
            const content = requireElement<HTMLDivElement>(container, '[data-testid="sel-content"]');
            const group = requireElement<HTMLDivElement>(container, '[data-testid="sel-group"]');
            const groupLabel = requireElement<HTMLDivElement>(container, '[data-testid="sel-group-label"]');
            const item = requireElement<HTMLDivElement>(container, '[data-testid="sel-item"]');
            const itemText = requireElement<HTMLSpanElement>(container, '[data-testid="sel-item-text"]');
            const itemDescription = requireElement<HTMLParagraphElement>(container, '[data-testid="sel-item-desc"]');
            const separator = requireElement<HTMLDivElement>(container, '[data-testid="sel-separator"]');

            expect(triggerRef).toBe(trigger);
            expect(trigger.classList.contains("cs-select-trigger")).toBe(true);
            expect(trigger.classList.contains("custom-trigger-cls")).toBe(true);

            expect(valueRef).toBe(valueElement);
            expect(valueElement.classList.contains("cs-select-trigger-value")).toBe(true);
            expect(valueElement.classList.contains("custom-value-cls")).toBe(true);

            expect(contentRef).toBe(content);
            expect(content.classList.contains("cs-select-content")).toBe(true);
            expect(content.classList.contains("custom-content-cls")).toBe(true);

            expect(groupRef).toBe(group);
            expect(group.classList.contains("cs-select-group")).toBe(true);
            expect(group.classList.contains("custom-group-cls")).toBe(true);

            expect(groupLabelRef).toBe(groupLabel);
            expect(groupLabel.classList.contains("cs-select-group-label")).toBe(true);
            expect(groupLabel.classList.contains("custom-glabel-cls")).toBe(true);

            expect(itemRef).toBe(item);
            expect(item.classList.contains("cs-select-item")).toBe(true);
            expect(item.classList.contains("custom-item-cls")).toBe(true);

            expect(itemTextRef).toBe(itemText);
            expect(itemText.classList.contains("cs-select-item-text")).toBe(true);
            expect(itemText.classList.contains("custom-text-cls")).toBe(true);

            expect(itemDescriptionRef).toBe(itemDescription);
            expect(itemDescription.tagName).toBe("P");
            expect(itemDescription.classList.contains("cs-select-item-description")).toBe(true);
            expect(itemDescription.classList.contains("custom-desc-cls")).toBe(true);

            expect(separatorRef).toBe(separator);
            expect(separator.classList.contains("cs-select-separator")).toBe(true);
            expect(separator.classList.contains("custom-sep-cls")).toBe(true);

            unmount(instance);
            flushSync();

            expect(triggerRef).toBeNull();
            expect(valueRef).toBeNull();
            expect(contentRef).toBeNull();
            expect(groupRef).toBeNull();
            expect(groupLabelRef).toBeNull();
            expect(itemRef).toBeNull();
            expect(itemTextRef).toBeNull();
            expect(itemDescriptionRef).toBeNull();
            expect(separatorRef).toBeNull();
        });
    });
});
