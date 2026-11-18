import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import DropdownTestHost, {
    type TestDropdownGroup,
    type TestDropdownItem,
    type TestDropdownRadioItem,
} from "./DropdownTestHost.internal.svelte";
import { DROPDOWN_SIZES, type DropdownSize } from "./index.ts";

const DEFAULT_ITEMS: TestDropdownItem[] = [
    { key: "edit", text: "Edit", shortcut: "⌘E" },
    { key: "duplicate", text: "Duplicate", description: "Make a copy" },
    { key: "delete", text: "Delete", negative: true },
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
    return requireElement<HTMLButtonElement>(root, "button.test-dropdown-trigger");
}

function requireContent(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-dropdown-content");
}

function requireListViewport(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-dropdown-list");
}

function requireItem(root: ParentNode, key: string): HTMLElement {
    return requireElement<HTMLElement>(root, `.cs-dropdown-item[data-item-key="${CSS.escape(key)}"]`);
}

describe("Dropdown Svelte 5 Component", () => {
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
                | (HTMLElement & { togglePopover?: (options?: { source?: HTMLElement }) => boolean })
                | null;
            if (!targetEl || !targetEl.hasAttribute("popover") || typeof targetEl.togglePopover !== "function") return;
            targetEl.togglePopover({ source: button });
        });
        document.body.append(container);
    });

    afterEach(() => {
        if (container.parentNode) {
            container.remove();
        }
        restorePrototypeProperty(HTMLElement.prototype, "matches", originalMatchesDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "showPopover", originalShowPopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "hidePopover", originalHidePopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "togglePopover", originalTogglePopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoViewDescriptor);
        vi.useRealTimers();
    });

    describe("Dropdown + dropdownTrigger wiring, sizes, and reactive disabled/enabled", () => {
        test("wires trigger ARIA attributes, content role/aria-labelledby, and data-size across xs..xl", () => {
            const onOpenChange = vi.fn();
            const state = $state<{ size: DropdownSize; open: boolean }>({ size: "md", open: false });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    id: "actions-menu",
                    items: DEFAULT_ITEMS,
                    onOpenChange,
                    get size() {
                        return state.size;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            expect(onOpenChange).not.toHaveBeenCalled();
            expect(trigger.id).toBe("actions-menu");
            expect(content.id).toBe("actions-menu-menu");
            expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
            expect(trigger.getAttribute("aria-controls")).toBe("actions-menu-menu");
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect("open" in trigger.dataset).toBe(false);
            expect(content.getAttribute("role")).toBe("menu");
            expect(content.getAttribute("aria-labelledby")).toBe("actions-menu");

            for (const size of DROPDOWN_SIZES) {
                state.size = size;
                flushSync();
                expect(content.dataset.size).toBe(size);
            }

            // Two-way bind:open syncs trigger ARIA + popover state
            state.open = true;
            flushSync();
            expect(content.matches(":popover-open")).toBe(true);
            expect(trigger.getAttribute("aria-expanded")).toBe("true");
            expect("open" in trigger.dataset).toBe(true);

            unmount(instance);
        });

        test("custom DropdownContent id='custom-menu' updates aria-controls reactively and opens on trigger click", () => {
            const state = $state<{ open: boolean; contentId: string | undefined }>({
                open: false,
                contentId: "custom-menu",
            });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    triggerOn: "click",
                    items: DEFAULT_ITEMS,
                    get contentId() {
                        return state.contentId;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            expect(content.id).toBe("custom-menu");
            expect(trigger.getAttribute("aria-controls")).toBe("custom-menu");

            dispatchClick(trigger);
            flushSync();

            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(trigger.getAttribute("aria-expanded")).toBe("true");

            // Reactive update to contentId updates menuId wiring on the trigger
            state.open = false;
            state.contentId = "rebound-menu";
            flushSync();
            expect(content.id).toBe("rebound-menu");
            expect(trigger.getAttribute("aria-controls")).toBe("rebound-menu");

            dispatchClick(trigger);
            flushSync();
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            unmount(instance);
        });

        test("supports strict controlled open (rejecting open keeps trigger & popover closed)", () => {
            const onOpenChange = vi.fn();

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    onOpenChange,
                    get open() {
                        return false;
                    },
                    set open(_next: boolean) {
                        // Strict controlled: ignore setter
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();

            expect(onOpenChange).toHaveBeenCalledWith(true);
            expect(content.matches(":popover-open")).toBe(false);
            expect(trigger.getAttribute("aria-expanded")).toBe("false");

            unmount(instance);
        });

        test("triggerOn='pointerdown' opens on mousedown and suppresses duplicate click; triggerOn='click' opens on click only", () => {
            const stateA = $state({ open: false });
            const instanceA = mount(DropdownTestHost, {
                target: container,
                props: {
                    triggerOn: "pointerdown",
                    items: DEFAULT_ITEMS,
                    get open() {
                        return stateA.open;
                    },
                    set open(next: boolean) {
                        stateA.open = next;
                    },
                },
            });
            flushSync();

            const triggerA = requireTrigger(container);
            dispatchPointerEvent(triggerA, "pointerdown");
            flushSync();
            expect(stateA.open).toBe(true);

            // Releasing the same click immediately after pointerdown must not double-toggle it closed
            dispatchClick(triggerA);
            flushSync();
            expect(stateA.open).toBe(true);

            unmount(instanceA);

            const stateB = $state({ open: false });
            const instanceB = mount(DropdownTestHost, {
                target: container,
                props: {
                    triggerOn: "click",
                    items: DEFAULT_ITEMS,
                    get open() {
                        return stateB.open;
                    },
                    set open(next: boolean) {
                        stateB.open = next;
                    },
                },
            });
            flushSync();

            const triggerB = requireTrigger(container);
            dispatchPointerEvent(triggerB, "pointerdown");
            flushSync();
            expect(stateB.open).toBe(false);

            dispatchClick(triggerB);
            flushSync();
            expect(stateB.open).toBe(true);

            unmount(instanceB);
        });

        test("reactive enabled: () => boolean toggles trigger activation in both directions (true -> false -> true)", () => {
            const state = $state({ open: false, enabled: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    triggerEnabled: () => state.enabled,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);

            // Initially enabled -> opens on pointerdown
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);

            // Close
            dispatchKeyDown(trigger, "Escape");
            flushSync();
            expect(state.open).toBe(false);

            // Disable reactively -> pointerdown and keyboard must not open
            state.enabled = false;
            flushSync();
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(false);

            dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            expect(state.open).toBe(false);

            // Re-enable reactively -> opens again
            state.enabled = true;
            flushSync();
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);

            unmount(instance);
        });

        test("dynamic dropdown.disabled closes an open menu, blocks items/opening, and recovers when re-enabled", () => {
            const state = $state({ open: false, disabled: false });
            const onOpenChange = vi.fn();

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    onOpenChange,
                    get disabled() {
                        return state.disabled;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            // Setting disabled=true while open closes the menu
            state.disabled = true;
            flushSync();
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);
            expect("disabled" in requireItem(container, "edit").dataset).toBe(true);

            // Cannot open while disabled
            dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            expect(state.open).toBe(false);

            // Re-enabling allows opening again
            state.disabled = false;
            flushSync();
            expect("disabled" in requireItem(container, "edit").dataset).toBe(false);

            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);

            unmount(instance);
        });
    });

    describe("Keyboard open, roving focus, and Escape", () => {
        test("ArrowDown, Enter, and Space focus first enabled item; ArrowUp focuses last enabled item; Escape closes & restores trigger focus", () => {
            const state = $state({ open: false });
            const items: TestDropdownItem[] = [
                { key: "disabled-first", text: "Disabled first", disabled: true },
                { key: "first-active", text: "First active" },
                { key: "middle", text: "Middle" },
                { key: "last-active", text: "Last active" },
                { key: "disabled-last", text: "Disabled last", disabled: true },
            ];

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const firstActive = requireItem(container, "first-active");
            const lastActive = requireItem(container, "last-active");

            // ArrowDown -> first active item
            trigger.focus();
            dispatchKeyDown(trigger, "ArrowDown");
            flushSync();
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(firstActive);

            // Escape on trigger closes & restores trigger focus
            dispatchKeyDown(trigger, "Escape");
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // Enter -> first active item
            dispatchKeyDown(trigger, "Enter");
            flushSync();
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(firstActive);

            // Escape from trigger while open
            dispatchKeyDown(trigger, "Escape");
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // Space -> first active item (and keyup is suppressed)
            dispatchKeyDown(trigger, " ");
            flushSync();
            const spaceUp = dispatchKeyUp(trigger, " ");
            expect(spaceUp.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(firstActive);

            // Close via Escape
            dispatchKeyDown(trigger, "Escape");
            flushSync();
            expect(state.open).toBe(false);

            // ArrowUp -> last active item
            dispatchKeyDown(trigger, "ArrowUp");
            flushSync();
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(lastActive);

            unmount(instance);
        });
    });

    describe("Typeahead & data-typeahead-label", () => {
        test("extractListboxItemLabel computes data-typeahead-label from DropdownItemText excluding description/shortcut and respects label override", () => {
            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    open: true,
                    items: [
                        {
                            key: "rename",
                            text: "Rename",
                            description: "Change file name",
                            shortcut: "F2",
                        },
                        {
                            key: "export",
                            label: "Custom Export",
                            text: "Export",
                            description: "Download CSV",
                            shortcut: "⌘E",
                        },
                    ],
                },
            });
            flushSync();

            const renameItem = requireItem(container, "rename");
            const exportItem = requireItem(container, "export");

            expect(renameItem.dataset.typeaheadLabel).toBe("Rename");
            expect(exportItem.dataset.typeaheadLabel).toBe("Custom Export");

            unmount(instance);
        });

        test("letter typeahead jumps via rovingFocus and guards Space against triggering/toggling while data-typeahead-active is set", () => {
            vi.useFakeTimers();
            try {
                const onRename = vi.fn();
                const onCheckedChange = vi.fn();
                const onRadioValueChange = vi.fn();
                const state = $state({
                    open: true,
                    checked: false,
                    radioValue: "compact",
                });

                const instance = mount(DropdownTestHost, {
                    target: container,
                    props: {
                        items: [
                            { key: "alpha", text: "Alpha" },
                            {
                                key: "rename",
                                text: "Rename",
                                description: "Zebra description",
                                shortcut: "F2",
                                onSelect: onRename,
                            },
                            {
                                key: "export",
                                label: "Custom Export",
                                text: "Export",
                                shortcut: "⌘E",
                            },
                        ],
                        showCheckboxItem: true,
                        checkboxLabel: "Show grid",
                        onCheckedChange,
                        radioItems: [
                            { value: "compact", text: "Compact" },
                            { value: "wide", text: "Wide" },
                        ],
                        onRadioValueChange,
                        get open() {
                            return state.open;
                        },
                        set open(next: boolean) {
                            state.open = next;
                        },
                        get checkboxChecked() {
                            return state.checked;
                        },
                        set checkboxChecked(next: boolean) {
                            state.checked = next;
                        },
                        get radioValue() {
                            return state.radioValue;
                        },
                        set radioValue(next: string | undefined) {
                            if (next !== undefined) state.radioValue = next;
                        },
                    },
                });
                flushSync();

                const content = requireContent(container);
                const list = requireListViewport(container);
                const alphaItem = requireItem(container, "alpha");
                const renameItem = requireItem(container, "rename");
                const exportItem = requireItem(container, "export");
                const cbItem = requireElement<HTMLDivElement>(container, '[role="menuitemcheckbox"]');
                const wideRadio = requireElement<HTMLDivElement>(
                    container,
                    '[role="menuitemradio"][data-value="wide"]'
                );

                alphaItem.focus();

                // Description ("Zebra") and shortcut ("F2") must not match typeahead
                dispatchKeyDown(alphaItem, "z");
                flushSync();
                expect(document.activeElement).toBe(alphaItem);
                vi.advanceTimersByTime(600);

                // Typing "r" jumps to "Rename" and activates data-typeahead-active + keyboard nav
                dispatchKeyDown(alphaItem, "r");
                flushSync();
                expect(document.activeElement).toBe(renameItem);
                expect("typeaheadActive" in list.dataset).toBe(true);
                expect(content.dataset.nav).toBe("keyboard");
                expect("arrowNav" in content.dataset).toBe(true);

                // Space while data-typeahead-active is set must NOT trigger DropdownItem onSelect or close menu
                dispatchKeyDown(renameItem, " ");
                flushSync();
                expect(onRename).not.toHaveBeenCalled();
                expect(state.open).toBe(true);
                vi.advanceTimersByTime(600);

                // Label override ("Custom Export") matches "c" rather than visible text "Export"
                dispatchKeyDown(renameItem, "c");
                flushSync();
                expect(document.activeElement).toBe(exportItem);
                vi.advanceTimersByTime(600);

                // Typing "s" jumps to DropdownCheckboxItem ("Show grid"); Space while active must NOT toggle
                dispatchKeyDown(exportItem, "s");
                flushSync();
                expect(document.activeElement).toBe(cbItem);
                expect("typeaheadActive" in list.dataset).toBe(true);

                dispatchKeyDown(cbItem, " ");
                flushSync();
                expect(state.checked).toBe(false);
                expect(onCheckedChange).not.toHaveBeenCalled();
                vi.advanceTimersByTime(600);

                // Typing "w" jumps to DropdownRadioItem ("Wide"); Space while active must NOT select
                dispatchKeyDown(cbItem, "w");
                flushSync();
                expect(document.activeElement).toBe(wideRadio);
                expect("typeaheadActive" in list.dataset).toBe(true);

                dispatchKeyDown(wideRadio, " ");
                flushSync();
                expect(state.radioValue).toBe("compact");
                expect(onRadioValueChange).not.toHaveBeenCalled();

                // Once typeahead buffer expires, Space activates normally
                vi.advanceTimersByTime(600);
                expect("typeaheadActive" in list.dataset).toBe(false);
                dispatchKeyDown(wideRadio, " ");
                flushSync();
                expect(state.radioValue).toBe("wide");
                expect(onRadioValueChange).toHaveBeenCalledWith("wide");

                unmount(instance);
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe("DropdownItem", () => {
        test("click, Enter, and Space trigger onSelect and close menu by default", () => {
            const onEdit = vi.fn();
            const state = $state({ open: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: [
                        { key: "edit", text: "Edit", onSelect: onEdit },
                        { key: "delete", text: "Delete", negative: true },
                    ],
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const editItem = requireItem(container, "edit");
            const deleteItem = requireItem(container, "delete");

            expect("negative" in deleteItem.dataset).toBe(true);
            expect("negative" in editItem.dataset).toBe(false);

            // Click activates and closes
            dispatchClick(editItem);
            flushSync();
            expect(onEdit).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // Re-open & activate via Enter
            state.open = true;
            flushSync();
            editItem.focus();
            dispatchKeyDown(editItem, "Enter");
            flushSync();
            expect(onEdit).toHaveBeenCalledTimes(2);
            expect(state.open).toBe(false);

            // Re-open & activate via Space
            state.open = true;
            flushSync();
            editItem.focus();
            dispatchKeyDown(editItem, " ");
            flushSync();
            expect(onEdit).toHaveBeenCalledTimes(3);
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("stays open when closeOnSelect={false} or event.preventDefault() is called in onSelect", () => {
            const onStayOpen = vi.fn();
            const onPreventClose = vi.fn((e: MouseEvent | KeyboardEvent) => {
                e.preventDefault();
            });
            const state = $state({ open: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: [
                        { key: "stay", text: "Stay open", closeOnSelect: false, onSelect: onStayOpen },
                        { key: "prevent", text: "Prevent default", onSelect: onPreventClose },
                    ],
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            dispatchClick(requireItem(container, "stay"));
            flushSync();
            expect(onStayOpen).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(true);

            dispatchClick(requireItem(container, "prevent"));
            flushSync();
            expect(onPreventClose).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(true);

            unmount(instance);
        });

        test("href renders <a> with role='menuitem' and does not fire onSelect twice on Enter", () => {
            const onLinkSelect = vi.fn();
            const state = $state({ open: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: [{ key: "docs", text: "Docs", href: "#docs", onSelect: onLinkSelect }],
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const linkItem = requireItem(container, "docs");
            expect(linkItem.tagName).toBe("A");
            expect(linkItem.getAttribute("role")).toBe("menuitem");
            expect(linkItem.getAttribute("href")).toBe("#docs");

            // Enter on href item defers to native anchor click (no double onSelect)
            linkItem.focus();
            dispatchKeyDown(linkItem, "Enter");
            flushSync();
            expect(onLinkSelect).not.toHaveBeenCalled();

            // Native click fires onSelect once
            dispatchClick(linkItem);
            flushSync();
            expect(onLinkSelect).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("disabled item blocks click, Enter, and Space activation", () => {
            const onDisabled = vi.fn();
            const state = $state({ open: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: [{ key: "blocked", text: "Blocked", href: "#blocked", disabled: true, onSelect: onDisabled }],
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const item = requireItem(container, "blocked");
            expect(item.getAttribute("aria-disabled")).toBe("true");
            expect("disabled" in item.dataset).toBe(true);
            expect(item.hasAttribute("href")).toBe(false);

            dispatchClick(item);
            dispatchKeyDown(item, "Enter");
            dispatchKeyDown(item, " ");
            flushSync();

            expect(onDisabled).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            unmount(instance);
        });
    });

    describe("DropdownCheckboxItem", () => {
        test("renders role='menuitemcheckbox', aria-checked (true/false/mixed), bind:checked, onCheckedChange, and keeps menu open by default", () => {
            const onCheckedChange = vi.fn();
            const state = $state({ open: true, checked: false, indeterminate: false });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    showCheckboxItem: true,
                    onCheckedChange,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get checkboxChecked() {
                        return state.checked;
                    },
                    set checkboxChecked(next: boolean) {
                        state.checked = next;
                    },
                    get checkboxIndeterminate() {
                        return state.indeterminate;
                    },
                },
            });
            flushSync();

            const cbItem = requireElement<HTMLDivElement>(container, '[role="menuitemcheckbox"]');
            expect(cbItem.getAttribute("aria-checked")).toBe("false");

            // Click toggles true and keeps menu open (closeOnSelect = false default)
            dispatchClick(cbItem);
            flushSync();
            expect(state.checked).toBe(true);
            expect(cbItem.getAttribute("aria-checked")).toBe("true");
            expect("checked" in cbItem.dataset).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);
            expect(state.open).toBe(true);

            // Enter toggles false
            cbItem.focus();
            dispatchKeyDown(cbItem, "Enter");
            flushSync();
            expect(state.checked).toBe(false);
            expect(cbItem.getAttribute("aria-checked")).toBe("false");
            expect(onCheckedChange).toHaveBeenLastCalledWith(false);
            expect(state.open).toBe(true);

            // Space toggles true
            dispatchKeyDown(cbItem, " ");
            flushSync();
            expect(state.checked).toBe(true);
            expect(cbItem.getAttribute("aria-checked")).toBe("true");
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);
            expect(state.open).toBe(true);

            // Indeterminate sets aria-checked="mixed"
            state.indeterminate = true;
            flushSync();
            expect(cbItem.getAttribute("aria-checked")).toBe("mixed");
            expect("indeterminate" in cbItem.dataset).toBe(true);

            unmount(instance);
        });

        test("respects closeOnSelect={true} and disabled on DropdownCheckboxItem", () => {
            const onCheckedChange = vi.fn();
            const state = $state({ open: true, checked: false, disabled: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    showCheckboxItem: true,
                    checkboxCloseOnSelect: true,
                    onCheckedChange,
                    get checkboxDisabled() {
                        return state.disabled;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get checkboxChecked() {
                        return state.checked;
                    },
                    set checkboxChecked(next: boolean) {
                        state.checked = next;
                    },
                },
            });
            flushSync();

            const cbItem = requireElement<HTMLDivElement>(container, '[role="menuitemcheckbox"]');
            dispatchClick(cbItem);
            flushSync();
            expect(onCheckedChange).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            state.disabled = false;
            flushSync();
            dispatchClick(cbItem);
            flushSync();
            expect(state.checked).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledWith(true);
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("onSelect with event.preventDefault() prevents toggle and close on click, Enter, and Space", () => {
            const onCheckedChange = vi.fn();
            const onCheckboxSelect = vi.fn((event: MouseEvent | KeyboardEvent) => {
                event.preventDefault();
            });
            const state = $state({ open: true, checked: false });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    showCheckboxItem: true,
                    checkboxCloseOnSelect: true,
                    onCheckboxSelect,
                    onCheckedChange,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get checkboxChecked() {
                        return state.checked;
                    },
                    set checkboxChecked(next: boolean) {
                        state.checked = next;
                    },
                },
            });
            flushSync();

            const cbItem = requireElement<HTMLDivElement>(container, '[role="menuitemcheckbox"]');

            dispatchClick(cbItem);
            flushSync();
            cbItem.focus();
            dispatchKeyDown(cbItem, "Enter");
            flushSync();
            dispatchKeyDown(cbItem, " ");
            flushSync();

            expect(onCheckboxSelect).toHaveBeenCalledTimes(3);
            expect(onCheckedChange).not.toHaveBeenCalled();
            expect(state.checked).toBe(false);
            expect(cbItem.getAttribute("aria-checked")).toBe("false");
            expect(state.open).toBe(true);

            unmount(instance);
        });
    });

    describe("DropdownRadioGroup + DropdownRadioItem", () => {
        const RADIO_ITEMS: TestDropdownRadioItem[] = [
            { value: "compact", text: "Compact" },
            { value: "comfortable", text: "Comfortable" },
            { value: "spacious", text: "Spacious", disabled: true },
        ];

        test("renders role='menuitemradio', aria-checked, bind:value, onValueChange, and selects via click, Enter, and Space without closing by default", () => {
            const onValueChange = vi.fn();
            const state = $state({ open: true, value: "compact" });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    radioItems: RADIO_ITEMS,
                    onRadioValueChange: onValueChange,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get radioValue() {
                        return state.value;
                    },
                    set radioValue(next: string | undefined) {
                        if (next !== undefined) state.value = next;
                    },
                },
            });
            flushSync();

            const compact = requireElement<HTMLDivElement>(container, '[role="menuitemradio"][data-value="compact"]');
            const comfortable = requireElement<HTMLDivElement>(
                container,
                '[role="menuitemradio"][data-value="comfortable"]'
            );
            const spacious = requireElement<HTMLDivElement>(container, '[role="menuitemradio"][data-value="spacious"]');

            expect(compact.getAttribute("aria-checked")).toBe("true");
            expect(comfortable.getAttribute("aria-checked")).toBe("false");

            // Clicking already-selected item does not fire onValueChange (idempotent)
            dispatchClick(compact);
            flushSync();
            expect(onValueChange).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            // Click selects comfortable & keeps menu open
            dispatchClick(comfortable);
            flushSync();
            expect(state.value).toBe("comfortable");
            expect(comfortable.getAttribute("aria-checked")).toBe("true");
            expect(compact.getAttribute("aria-checked")).toBe("false");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("comfortable");
            expect(state.open).toBe(true);

            // Enter on compact selects compact
            compact.focus();
            dispatchKeyDown(compact, "Enter");
            flushSync();
            expect(state.value).toBe("compact");
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("compact");
            expect(state.open).toBe(true);

            // Space on comfortable selects comfortable
            comfortable.focus();
            dispatchKeyDown(comfortable, " ");
            flushSync();
            expect(state.value).toBe("comfortable");
            expect(onValueChange).toHaveBeenCalledTimes(3);
            expect(onValueChange).toHaveBeenLastCalledWith("comfortable");
            expect(state.open).toBe(true);

            // Disabled radio item blocks selection
            dispatchClick(spacious);
            dispatchKeyDown(spacious, "Enter");
            flushSync();
            expect(state.value).toBe("comfortable");
            expect(onValueChange).toHaveBeenCalledTimes(3);

            unmount(instance);
        });

        test("onSelect with event.preventDefault() prevents selection and closeOnSelect={true} closes menu and restores focus", () => {
            const onValueChange = vi.fn();
            const onBlockedSelect = vi.fn((event: MouseEvent | KeyboardEvent) => {
                event.preventDefault();
            });
            const state = $state({ open: true, value: "compact" });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    radioItems: [
                        { value: "compact", text: "Compact" },
                        {
                            value: "comfortable",
                            text: "Comfortable",
                            closeOnSelect: true,
                            onSelect: onBlockedSelect,
                        },
                        { value: "spacious", text: "Spacious", closeOnSelect: true },
                    ],
                    onRadioValueChange: onValueChange,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get radioValue() {
                        return state.value;
                    },
                    set radioValue(next: string | undefined) {
                        if (next !== undefined) state.value = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const comfortable = requireElement<HTMLDivElement>(
                container,
                '[role="menuitemradio"][data-value="comfortable"]'
            );
            const spacious = requireElement<HTMLDivElement>(
                container,
                '[role="menuitemradio"][data-value="spacious"]'
            );

            // Prevented onSelect blocks selection and closeOnSelect across click, Enter, and Space
            dispatchClick(comfortable);
            flushSync();
            comfortable.focus();
            dispatchKeyDown(comfortable, "Enter");
            flushSync();
            dispatchKeyDown(comfortable, " ");
            flushSync();

            expect(onBlockedSelect).toHaveBeenCalledTimes(3);
            expect(onValueChange).not.toHaveBeenCalled();
            expect(state.value).toBe("compact");
            expect(state.open).toBe(true);

            // closeOnSelect={true} closes menu and restores focus to trigger
            dispatchClick(spacious);
            flushSync();

            expect(state.value).toBe("spacious");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("spacious");
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            unmount(instance);
        });
    });

    describe("Groups, Separators, Pinned vs Scrollable Header/Footer, and Keyboard/Pointer Nav Reset", () => {
        test("wires DropdownGroup aria-labelledby to DropdownGroupLabel, renders DropdownSeparator, and pins header/footer outside ScrollArea", () => {
            const groups: TestDropdownGroup[] = [
                {
                    key: "g1",
                    label: "Workspace",
                    items: [{ key: "settings", text: "Settings" }],
                },
            ];

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    open: true,
                    groups,
                    showSeparator: true,
                    pinnedHeaderText: "Pinned Header",
                    pinnedFooterText: "Pinned Footer",
                    scrollableHeaderText: "Scrollable Header",
                    scrollableFooterText: "Scrollable Footer",
                },
            });
            flushSync();

            const content = requireContent(container);
            const list = requireListViewport(container);
            const scrollArea = requireElement<HTMLElement>(content, ".cs-scroll-area");
            const group = requireElement<HTMLDivElement>(container, '[data-group-key="g1"]');
            const groupLabel = requireElement<HTMLDivElement>(group, ".cs-dropdown-group-label");
            const separator = requireElement<HTMLDivElement>(container, '[role="separator"]');
            const pinnedHeader = requireElement<HTMLDivElement>(content, '[data-testid="pinned-header"]');
            const pinnedFooter = requireElement<HTMLDivElement>(content, '[data-testid="pinned-footer"]');
            const scrollableHeader = requireElement<HTMLDivElement>(list, '[data-testid="scrollable-header"]');
            const scrollableFooter = requireElement<HTMLDivElement>(list, '[data-testid="scrollable-footer"]');

            expect(group.getAttribute("role")).toBe("group");
            expect(groupLabel.id).toBeTruthy();
            expect(group.getAttribute("aria-labelledby")).toBe(groupLabel.id);
            expect(separator.getAttribute("aria-orientation")).toBe("horizontal");

            // Pinned header/footer are direct children of content outside ScrollArea
            expect(scrollArea.contains(pinnedHeader)).toBe(false);
            expect(scrollArea.contains(pinnedFooter)).toBe(false);
            // Scrollable header/footer are inside listRef
            expect(list.contains(scrollableHeader)).toBe(true);
            expect(list.contains(scrollableFooter)).toBe(true);

            unmount(instance);
        });

        test("keyboard navigation sets data-nav='keyboard' and data-arrow-nav; mouse pointermove resets them and focuses listRef", () => {
            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    open: true,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const content = requireContent(container);
            const list = requireListViewport(container);
            const editItem = requireItem(container, "edit");
            const duplicateItem = requireItem(container, "duplicate");

            editItem.focus();
            dispatchKeyDown(editItem, "ArrowDown");
            flushSync();

            expect(document.activeElement).toBe(duplicateItem);
            expect(content.dataset.nav).toBe("keyboard");
            expect("arrowNav" in content.dataset).toBe(true);

            // Mouse pointermove clears keyboard nav flags and moves focus to listRef
            dispatchPointerEvent(duplicateItem, "pointermove", { pointerType: "mouse" });
            flushSync();

            expect("nav" in content.dataset).toBe(false);
            expect("arrowNav" in content.dataset).toBe(false);
            expect(document.activeElement).toBe(list);

            unmount(instance);
        });

        test("native toggle event (newState='closed') syncs open=false and resets data-nav and data-arrow-nav", () => {
            const onOpenChange = vi.fn();
            const state = $state({ open: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    onOpenChange,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const editItem = requireItem(container, "edit");

            editItem.focus();
            dispatchKeyDown(editItem, "ArrowDown");
            flushSync();

            expect(content.dataset.nav).toBe("keyboard");
            expect("arrowNav" in content.dataset).toBe(true);

            // Simulate browser light-dismiss (e.g. outside click / top-layer dismiss) firing toggle newState="closed"
            openPopovers.delete(content);
            dispatchToggleEvent(content, "closed", "open");
            flushSync();

            expect(state.open).toBe(false);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect("nav" in content.dataset).toBe(false);
            expect("arrowNav" in content.dataset).toBe(false);

            unmount(instance);
        });
    });

    describe("Custom widget coexistence, Tab handling, and handleFocusOut", () => {
        test("typing, Space, ArrowDown, Home, and End inside embedded <input> and role='switch' are NOT hijacked by rovingFocus or typeahead", () => {
            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    open: true,
                    customWidgets: true,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const content = requireContent(container);
            const input = requireElement<HTMLInputElement>(container, '[data-testid="custom-input"]');
            const customSwitch = requireElement<HTMLButtonElement>(container, '[data-testid="custom-switch"]');

            input.focus();
            expect(document.activeElement).toBe(input);

            for (const key of ["d", " ", "ArrowDown", "Home", "End"]) {
                const ev = dispatchKeyDown(input, key);
                flushSync();
                expect(ev.defaultPrevented).toBe(false);
                expect(document.activeElement).toBe(input);
                expect("nav" in content.dataset).toBe(false);
                expect("arrowNav" in content.dataset).toBe(false);
            }

            customSwitch.focus();
            expect(document.activeElement).toBe(customSwitch);
            const switchSpace = dispatchKeyDown(customSwitch, " ");
            const switchDown = dispatchKeyDown(customSwitch, "ArrowDown");
            flushSync();
            expect(switchSpace.defaultPrevented).toBe(false);
            expect(switchDown.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(customSwitch);

            unmount(instance);
        });

        test("Tab on .cs-dropdown-item closes menu and focuses trigger; Tab on custom widget keeps menu open; focusout outside closes menu", () => {
            const state = $state({ open: true });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    customWidgets: true,
                    outsideButton: true,
                    items: DEFAULT_ITEMS,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const input = requireElement<HTMLInputElement>(container, '[data-testid="custom-input"]');
            const customSwitch = requireElement<HTMLButtonElement>(container, '[data-testid="custom-switch"]');
            const editItem = requireItem(container, "edit");
            const outsideButton = requireElement<HTMLButtonElement>(container, '[data-testid="outside-button"]');

            // Internal focusout from input to customSwitch must NOT close menu
            input.focus();
            input.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: customSwitch }));
            flushSync();
            expect(state.open).toBe(true);

            // Tab on custom widget does NOT close menu
            customSwitch.focus();
            dispatchKeyDown(customSwitch, "Tab");
            flushSync();
            expect(state.open).toBe(true);

            // External focusout (relatedTarget outside DropdownContent) closes menu without stealing focus back to trigger
            outsideButton.focus();
            content.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideButton }));
            flushSync();
            expect(state.open).toBe(false);

            // Re-open, focus .cs-dropdown-item, and press Tab -> closes menu & focuses trigger synchronously
            state.open = true;
            flushSync();
            editItem.focus();
            dispatchKeyDown(editItem, "Tab");
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            unmount(instance);
        });
    });

    describe("Press-drag-release", () => {
        test("pointerdown on trigger -> drag/hold -> pointerup on DropdownItem commits selection and closes menu", () => {
            const onDuplicate = vi.fn();
            const state = $state({ open: false });

            const instance = mount(DropdownTestHost, {
                target: container,
                props: {
                    triggerOn: "pointerdown",
                    items: [
                        { key: "edit", text: "Edit" },
                        { key: "duplicate", text: "Duplicate", onSelect: onDuplicate },
                    ],
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const duplicateItem = requireItem(container, "duplicate");

            dispatchPointerEvent(trigger, "pointerdown", { clientX: 20, clientY: 20 });
            flushSync();
            expect(state.open).toBe(true);

            // Dragged to item (> 6px distance) and released
            dispatchPointerEvent(duplicateItem, "pointerup", { clientX: 40, clientY: 80 });
            flushSync();

            expect(onDuplicate).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            unmount(instance);
        });
    });
});
