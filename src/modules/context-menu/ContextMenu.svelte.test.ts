import { Copy, Trash2 } from "@lucide/svelte";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ContextMenuTestHost, {
    type TestContextMenuGroup,
    type TestContextMenuItem,
    type TestContextMenuRadioItem,
} from "./ContextMenuTestHost.internal.svelte";
import { CONTEXT_MENU_SIZES, type ContextMenuSize } from "./index.ts";

const DEFAULT_ITEMS: TestContextMenuItem[] = [
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

function dispatchContextMenu(target: EventTarget, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: 120,
        clientY: 80,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchClick(target: EventTarget, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...init,
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

function requireTrigger(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.test-context-menu-trigger");
}

function requireSecondTrigger(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.test-context-menu-trigger-second");
}

function requireAnchor(root: ParentNode): HTMLSpanElement {
    return requireElement<HTMLSpanElement>(root, "span.cs-context-menu-anchor");
}

function requireContent(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-context-menu-content");
}

function requireListViewport(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-context-menu-list");
}

function requireItem(root: ParentNode, key: string): HTMLElement {
    return requireElement<HTMLElement>(root, `.cs-context-menu-item[data-item-key="${CSS.escape(key)}"]`);
}

describe("ContextMenu Svelte 5 Component", () => {
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

    describe("Triggering & Semantics", () => {
        test("right-click opens menu, calls preventDefault(), sets data-open on trigger without injecting aria-haspopup/aria-expanded, and leaves left-click untouched", () => {
            const onOpenChange = vi.fn();
            const onTriggerOpen = vi.fn();
            const state = $state<{ size: ContextMenuSize; open: boolean }>({ size: "md", open: false });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    id: "canvas-ctx",
                    items: DEFAULT_ITEMS,
                    onOpenChange,
                    onTriggerOpen,
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
            const list = requireListViewport(container);

            // Initial mount: closed, no spurious callbacks or trigger ARIA injection
            expect(onOpenChange).not.toHaveBeenCalled();
            expect(onTriggerOpen).not.toHaveBeenCalled();
            expect(content.id).toBe("canvas-ctx-menu");
            expect(content.getAttribute("role")).toBe("menu");
            expect(trigger.hasAttribute("aria-haspopup")).toBe(false);
            expect(trigger.hasAttribute("aria-expanded")).toBe(false);
            expect(trigger.hasAttribute("aria-controls")).toBe(false);
            expect("open" in trigger.dataset).toBe(false);

            for (const size of CONTEXT_MENU_SIZES) {
                state.size = size;
                flushSync();
                expect(content.dataset.size).toBe(size);
            }

            // Left-click (pointerdown + click, button === 0) must NOT open or prevent default
            const leftDown = dispatchPointerEvent(trigger, "pointerdown", { button: 0 });
            const leftClick = dispatchClick(trigger, { button: 0 });
            flushSync();
            expect(leftDown.defaultPrevented).toBe(false);
            expect(leftClick.defaultPrevented).toBe(false);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(onOpenChange).not.toHaveBeenCalled();

            // Right-click (contextmenu) opens menu, prevents default, focuses listRef, leaves keyboard nav unset
            const ctxEvent = dispatchContextMenu(trigger, { clientX: 150, clientY: 95 });
            flushSync();

            expect(ctxEvent.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);
            expect(onTriggerOpen).toHaveBeenCalledTimes(1);
            expect(onTriggerOpen).toHaveBeenLastCalledWith(ctxEvent);
            expect("open" in trigger.dataset).toBe(true);
            expect(trigger.hasAttribute("aria-haspopup")).toBe(false);
            expect(trigger.hasAttribute("aria-expanded")).toBe(false);
            expect(document.activeElement).toBe(list);
            expect("nav" in content.dataset).toBe(false);
            expect("arrowNav" in content.dataset).toBe(false);

            unmount(instance);
        });

        test("Shift+F10 and ContextMenu key open menu, call preventDefault(), set data-nav='keyboard' / data-arrow-nav, and focus first enabled item", () => {
            const state = $state({ open: false });
            const items: TestContextMenuItem[] = [
                { key: "disabled-first", text: "Disabled first", disabled: true },
                { key: "first-active", text: "First active" },
                { key: "last-active", text: "Last active" },
            ];

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items,
                    showFocusableTriggerChild: true,
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
            const childButton = requireElement<HTMLButtonElement>(container, '[data-testid="trigger-child-button"]');
            const anchor = requireAnchor(container);
            const content = requireContent(container);
            const firstActive = requireItem(container, "first-active");

            vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
                left: 100,
                top: 200,
                width: 200,
                height: 100,
                right: 300,
                bottom: 300,
                x: 100,
                y: 200,
                toJSON: () => ({}),
            });
            vi.spyOn(childButton, "getBoundingClientRect").mockReturnValue({
                left: 140,
                top: 220,
                width: 80,
                height: 40,
                right: 220,
                bottom: 260,
                x: 140,
                y: 220,
                toJSON: () => ({}),
            });

            // Shift+F10 on trigger -> optical center of trigger (200, 250)
            trigger.focus();
            const shiftF10 = dispatchKeyDown(trigger, "F10", { shiftKey: true });
            flushSync();

            expect(shiftF10.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");
            expect("arrowNav" in content.dataset).toBe(true);
            expect(document.activeElement).toBe(firstActive);
            expect(anchor.style.left).toBe("200px");
            expect(anchor.style.top).toBe("250px");

            // Escape closes and restores focus to trigger
            dispatchKeyDown(firstActive, "Escape");
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // ContextMenu key on focused child button -> optical center of childButton (180, 240)
            childButton.focus();
            const ctxKey = dispatchKeyDown(childButton, "ContextMenu");
            flushSync();

            expect(ctxKey.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");
            expect("arrowNav" in content.dataset).toBe(true);
            expect(document.activeElement).toBe(firstActive);
            expect(anchor.style.left).toBe("180px");
            expect(anchor.style.top).toBe("240px");

            // Escape closes and restores focus to childButton (the activeElement before open)
            dispatchKeyDown(firstActive, "Escape");
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(childButton);

            unmount(instance);
        });

        test("Shift+F10 on an empty or all-disabled menu falls back to focusing listRef", () => {
            const state = $state<{ open: boolean; items: TestContextMenuItem[] }>({
                open: false,
                items: [],
            });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    get items() {
                        return state.items;
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
            const list = requireListViewport(container);

            // Empty menu -> Shift+F10 focuses listRef
            trigger.focus();
            dispatchKeyDown(trigger, "F10", { shiftKey: true });
            flushSync();
            expect(state.open).toBe(true);
            expect(content.dataset.nav).toBe("keyboard");
            expect("arrowNav" in content.dataset).toBe(true);
            expect(document.activeElement).toBe(list);

            // Close and test all-disabled items -> Shift+F10 still focuses listRef
            dispatchKeyDown(list, "Escape");
            flushSync();
            expect(state.open).toBe(false);

            state.items = [
                { key: "d1", text: "Disabled 1", disabled: true },
                { key: "d2", text: "Disabled 2", disabled: true },
            ];
            flushSync();

            trigger.focus();
            dispatchKeyDown(trigger, "F10", { shiftKey: true });
            flushSync();
            expect(state.open).toBe(true);
            expect(document.activeElement).toBe(list);

            unmount(instance);
        });

        test("unmounting the active contextMenuTrigger while open clears data-open via unregisterTrigger", () => {
            const state = $state({ open: false, showSecond: true });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    get showSecondTrigger() {
                        return state.showSecond;
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

            const trigger2 = requireSecondTrigger(container);
            trigger2.focus();
            dispatchContextMenu(trigger2, { clientX: 120, clientY: 140 });
            flushSync();

            expect(state.open).toBe(true);
            expect("open" in trigger2.dataset).toBe(true);

            // Unmount active trigger while menu is open
            state.showSecond = false;
            flushSync();

            expect("open" in trigger2.dataset).toBe(false);
            expect(state.open).toBe(true);

            // Closing after active trigger unmount does not throw or focus detached element
            dispatchKeyDown(requireListViewport(container), "Escape");
            flushSync();
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("N:1 multiple triggers sharing one ContextMenu move data-open, fire trigger-specific onOpen, and update anchor coordinates", () => {
            const onFirstOpen = vi.fn();
            const onSecondOpen = vi.fn();
            const state = $state({ open: false, showSecond: true });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    onTriggerOpen: onFirstOpen,
                    onSecondTriggerOpen: onSecondOpen,
                    get showSecondTrigger() {
                        return state.showSecond;
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

            const trigger1 = requireTrigger(container);
            const trigger2 = requireSecondTrigger(container);
            const anchor = requireAnchor(container);

            // Right-click trigger 1
            dispatchContextMenu(trigger1, { clientX: 60, clientY: 90 });
            flushSync();
            expect(state.open).toBe(true);
            expect("open" in trigger1.dataset).toBe(true);
            expect("open" in trigger2.dataset).toBe(false);
            expect(onFirstOpen).toHaveBeenCalledTimes(1);
            expect(onSecondOpen).not.toHaveBeenCalled();
            expect(anchor.style.left).toBe("60px");
            expect(anchor.style.top).toBe("90px");

            // Right-click trigger 2 while open -> moves data-open & coordinates
            dispatchContextMenu(trigger2, { clientX: 310, clientY: 220 });
            flushSync();
            expect(state.open).toBe(true);
            expect("open" in trigger1.dataset).toBe(false);
            expect("open" in trigger2.dataset).toBe(true);
            expect(onSecondOpen).toHaveBeenCalledTimes(1);
            expect(anchor.style.left).toBe("310px");
            expect(anchor.style.top).toBe("220px");

            // Switch back to trigger 1
            dispatchContextMenu(trigger1, { clientX: 75, clientY: 110 });
            flushSync();
            expect("open" in trigger1.dataset).toBe(true);
            expect("open" in trigger2.dataset).toBe(false);
            expect(onFirstOpen).toHaveBeenCalledTimes(2);

            unmount(instance);
        });

        test("disabled on ContextMenu and enabled: false / () => boolean on contextMenuTrigger do NOT intercept contextmenu or Shift+F10", () => {
            const state = $state({ open: false, disabled: false, enabled: false });
            const onOpenChange = vi.fn();

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    onOpenChange,
                    triggerEnabled: () => state.enabled,
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

            // Initially enabled: false -> native contextmenu & Shift+F10 are NOT prevented
            const disabledCtx = dispatchContextMenu(trigger, { clientX: 50, clientY: 50 });
            trigger.focus();
            const disabledKey = dispatchKeyDown(trigger, "F10", { shiftKey: true });
            flushSync();
            expect(disabledCtx.defaultPrevented).toBe(false);
            expect(disabledKey.defaultPrevented).toBe(false);
            expect(state.open).toBe(false);
            expect(onOpenChange).not.toHaveBeenCalled();

            // Re-enable trigger -> opens
            state.enabled = true;
            flushSync();
            const enabledCtx = dispatchContextMenu(trigger, { clientX: 50, clientY: 50 });
            flushSync();
            expect(enabledCtx.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            // Dynamic ContextMenu disabled=true while open closes menu, marks items disabled, and stops intercepting
            state.disabled = true;
            flushSync();
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect("disabled" in requireItem(container, "edit").dataset).toBe(true);

            const menuDisabledCtx = dispatchContextMenu(trigger, { clientX: 80, clientY: 80 });
            flushSync();
            expect(menuDisabledCtx.defaultPrevented).toBe(false);
            expect(state.open).toBe(false);

            // Re-enabling ContextMenu recovers opening
            state.disabled = false;
            flushSync();
            expect("disabled" in requireItem(container, "edit").dataset).toBe(false);
            const recoveredCtx = dispatchContextMenu(trigger, { clientX: 80, clientY: 80 });
            flushSync();
            expect(recoveredCtx.defaultPrevented).toBe(true);
            expect(state.open).toBe(true);

            unmount(instance);
        });

        test("aria-label defaults to localized label and supports custom aria-label / aria-labelledby overrides", () => {
            const state = $state<{ ariaLabel?: string; ariaLabelledby?: string }>({});

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items: DEFAULT_ITEMS,
                    externalHeadingId: "ctx-heading",
                    get ariaLabel() {
                        return state.ariaLabel;
                    },
                    get ariaLabelledby() {
                        return state.ariaLabelledby;
                    },
                },
            });
            flushSync();

            const content = requireContent(container);
            expect(content.getAttribute("aria-label")).toBeTruthy();
            expect(content.hasAttribute("aria-labelledby")).toBe(false);

            state.ariaLabel = "File actions";
            flushSync();
            expect(content.getAttribute("aria-label")).toBe("File actions");

            state.ariaLabelledby = "ctx-heading";
            flushSync();
            expect(content.getAttribute("aria-labelledby")).toBe("ctx-heading");
            expect(content.hasAttribute("aria-label")).toBe(false);

            unmount(instance);
        });

        test("supports strict controlled open (rejecting open keeps popover closed and data-open unset)", () => {
            const onOpenChange = vi.fn();

            const instance = mount(ContextMenuTestHost, {
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

            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();

            expect(onOpenChange).toHaveBeenCalledWith(true);
            expect(content.matches(":popover-open")).toBe(false);
            expect("open" in trigger.dataset).toBe(false);

            unmount(instance);
        });
    });

    describe("Virtual Anchor Positioning & Repositioning", () => {
        test("renders 0x0 .cs-context-menu-anchor sibling before Popover with anchor-name and clamps coordinates to [4, innerWidth - 4] / [4, innerHeight - 4]", () => {
            const state = $state({ open: false, contentId: undefined as string | undefined });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    id: "file-ctx",
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
            const anchor = requireAnchor(container);
            const content = requireContent(container);

            // Sibling immediately before Popover (never inside Popover)
            expect(content.contains(anchor)).toBe(false);
            expect(anchor.nextElementSibling).toBe(content);
            expect(anchor.getAttribute("aria-hidden")).toBe("true");
            expect(anchor.getAttribute("style")).toContain("anchor-name: --anchor-file-ctx-menu");

            // Custom contentId updates anchor-name reactively
            state.contentId = "custom-ctx";
            flushSync();
            expect(content.id).toBe("custom-ctx");
            expect(anchor.getAttribute("style")).toContain("anchor-name: --anchor-custom-ctx");

            // Clamp negative coordinates to 4px
            dispatchContextMenu(trigger, { clientX: -20, clientY: 0 });
            flushSync();
            expect(anchor.style.left).toBe("4px");
            expect(anchor.style.top).toBe("4px");

            // Clamp coordinates beyond viewport to [innerWidth - 4, innerHeight - 4]
            dispatchContextMenu(trigger, { clientX: window.innerWidth + 100, clientY: window.innerHeight + 50 });
            flushSync();
            expect(anchor.style.left).toBe(`${window.innerWidth - 4}px`);
            expect(anchor.style.top).toBe(`${window.innerHeight - 4}px`);

            unmount(instance);
        });

        test("re-right-clicking while open updates coordinates, sets data-instant, and clears it on next frame", () => {
            const state = $state({ open: false });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
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
            const anchor = requireAnchor(container);
            const content = requireContent(container);

            // Initial open is not an instant reposition
            dispatchContextMenu(trigger, { clientX: 90, clientY: 70 });
            flushSync();
            expect("instant" in content.dataset).toBe(false);
            expect(anchor.style.left).toBe("90px");
            expect(anchor.style.top).toBe("70px");

            // Re-right-click while open -> updates coordinates and sets data-instant
            dispatchContextMenu(trigger, { clientX: 240, clientY: 160 });
            flushSync();
            expect(anchor.style.left).toBe("240px");
            expect(anchor.style.top).toBe("160px");
            expect("instant" in content.dataset).toBe(true);

            // Next animation frame clears data-instant
            vi.runAllTimers();
            flushSync();
            expect("instant" in content.dataset).toBe(false);

            unmount(instance);
        });

        test("right-clicking inside already-open ContextMenuContent suppresses native contextmenu", () => {
            const onContentContextMenu = vi.fn();
            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    open: true,
                    items: DEFAULT_ITEMS,
                    onContentContextMenu,
                },
            });
            flushSync();

            const editItem = requireItem(container, "edit");
            const innerCtx = dispatchContextMenu(editItem, { clientX: 110, clientY: 120 });
            flushSync();

            expect(onContentContextMenu).toHaveBeenCalledTimes(1);
            expect(innerCtx.defaultPrevented).toBe(true);

            unmount(instance);
        });

        test("compensates for non-zero fixed containing-block origin on anchor without affecting standalone { left: 0, top: 0 }", () => {
            const state = $state({ open: false });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
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
            const anchor = requireAnchor(container);

            let origin = { left: 120, top: 80 };
            vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(() => {
                const isZeroed = anchor.style.left === "0px" && anchor.style.top === "0px";
                const left = isZeroed ? origin.left : 0;
                const top = isZeroed ? origin.top : 0;
                return {
                    left,
                    top,
                    right: left,
                    bottom: top,
                    width: 0,
                    height: 0,
                    x: left,
                    y: top,
                    toJSON: () => ({}),
                } as DOMRect;
            });

            dispatchContextMenu(trigger, { clientX: 300, clientY: 200 });
            flushSync();
            expect(anchor.style.left).toBe("180px");
            expect(anchor.style.top).toBe("120px");

            origin = { left: 0, top: 0 };
            dispatchContextMenu(trigger, { clientX: 300, clientY: 200 });
            flushSync();
            expect(anchor.style.left).toBe("300px");
            expect(anchor.style.top).toBe("200px");

            unmount(instance);
        });
    });

    describe("OS Timing & Right-Button Drag-Release", () => {
        test("plain right-click-and-release (< 4px travel) does NOT activate item; drag-release (>= 4px travel) DOES activate item", () => {
            const onEdit = vi.fn();
            const onDuplicate = vi.fn();
            const state = $state({ open: false });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items: [
                        { key: "edit", text: "Edit", onSelect: onEdit },
                        { key: "duplicate", text: "Duplicate", onSelect: onDuplicate },
                        { key: "blocked", text: "Blocked", disabled: true },
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
            const duplicateItem = requireItem(container, "duplicate");
            const blockedItem = requireItem(container, "blocked");

            // Open at (100, 100) and release right button within 3px -> must NOT activate
            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();
            dispatchPointerEvent(editItem, "pointerup", {
                pointerType: "mouse",
                button: 2,
                clientX: 102,
                clientY: 102,
            });
            flushSync();
            expect(onEdit).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            // Re-open at (100, 100), left-button pointerup at >= 4px must NOT trigger drag-release
            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();
            dispatchPointerEvent(editItem, "pointerup", {
                pointerType: "mouse",
                button: 0,
                clientX: 140,
                clientY: 140,
            });
            flushSync();
            expect(onEdit).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            // Re-open at (100, 100), right-button drag-release on disabled item must NOT activate
            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();
            dispatchPointerEvent(blockedItem, "pointerup", {
                pointerType: "mouse",
                button: 2,
                clientX: 140,
                clientY: 140,
            });
            flushSync();
            expect(state.open).toBe(true);

            // Re-open at (100, 100) via pointer; right-button drag-release (>= 4px) onto duplicateItem activates and closes without forcing focus onto trigger
            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();
            dispatchPointerEvent(duplicateItem, "pointerup", {
                pointerType: "mouse",
                button: 2,
                clientX: 120,
                clientY: 140,
            });
            flushSync();
            expect(onDuplicate).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(document.activeElement).not.toBe(trigger);

            unmount(instance);
        });

        test("right-button drag-release also toggles checkbox and selects radio item", () => {
            const onCheckedChange = vi.fn();
            const onRadioValueChange = vi.fn();
            const state = $state({ open: false, checked: false, radioValue: "compact" });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    showCheckboxItem: true,
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

            const trigger = requireTrigger(container);
            const cbItem = requireElement<HTMLDivElement>(container, '[role="menuitemcheckbox"]');
            const wideRadio = requireElement<HTMLDivElement>(container, '[role="menuitemradio"][data-value="wide"]');

            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();
            dispatchPointerEvent(cbItem, "pointerup", {
                pointerType: "mouse",
                button: 2,
                clientX: 115,
                clientY: 130,
            });
            flushSync();
            expect(state.checked).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledWith(true);

            // Second drag-release requires a new contextmenu open gesture
            dispatchContextMenu(trigger, { clientX: 100, clientY: 100 });
            flushSync();
            dispatchPointerEvent(wideRadio, "pointerup", {
                pointerType: "mouse",
                button: 2,
                clientX: 115,
                clientY: 160,
            });
            flushSync();
            expect(state.radioValue).toBe("wide");
            expect(onRadioValueChange).toHaveBeenCalledWith("wide");

            unmount(instance);
        });
    });

    describe("ContextMenuItem, Checkbox, RadioGroup, Navigation & Typeahead", () => {
        test("ContextMenuItem supports click/Enter/Space, closeOnSelect={false}, preventDefault(), negative, href, and disabled", () => {
            const onEdit = vi.fn();
            const onStay = vi.fn();
            const onPrevent = vi.fn((e: MouseEvent | KeyboardEvent) => {
                e.preventDefault();
            });
            const onLink = vi.fn();
            const onDisabled = vi.fn();
            const state = $state({ open: false });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    items: [
                        { key: "edit", text: "Edit", onSelect: onEdit },
                        { key: "delete", text: "Delete", negative: true },
                        { key: "stay", text: "Stay", closeOnSelect: false, onSelect: onStay },
                        { key: "prevent", text: "Prevent", onSelect: onPrevent },
                        { key: "docs", text: "Docs", href: "#docs", onSelect: onLink },
                        { key: "blocked", text: "Blocked", href: "#blocked", disabled: true, onSelect: onDisabled },
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
            const stayItem = requireItem(container, "stay");
            const preventItem = requireItem(container, "prevent");
            const docsItem = requireItem(container, "docs");
            const blockedItem = requireItem(container, "blocked");

            expect("negative" in deleteItem.dataset).toBe(true);
            expect("negative" in editItem.dataset).toBe(false);
            expect(docsItem.tagName).toBe("A");
            expect(docsItem.getAttribute("role")).toBe("menuitem");
            expect(docsItem.getAttribute("href")).toBe("#docs");
            expect(blockedItem.getAttribute("aria-disabled")).toBe("true");
            expect("disabled" in blockedItem.dataset).toBe(true);
            expect(blockedItem.hasAttribute("href")).toBe(false);

            // Open via contextmenu; closing via click must NOT force focus onto trigger
            dispatchContextMenu(trigger, { clientX: 50, clientY: 50 });
            flushSync();

            // closeOnSelect={false} and preventDefault() keep menu open
            dispatchClick(stayItem);
            flushSync();
            expect(onStay).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(true);

            dispatchClick(preventItem);
            flushSync();
            expect(onPrevent).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(true);

            // Disabled blocks click/Enter/Space
            dispatchClick(blockedItem);
            dispatchKeyDown(blockedItem, "Enter");
            dispatchKeyDown(blockedItem, " ");
            flushSync();
            expect(onDisabled).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            // Click on normal item activates and closes without forcing focus onto trigger
            dispatchClick(editItem);
            flushSync();
            expect(onEdit).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);
            expect(document.activeElement).not.toBe(trigger);

            // Enter & Space activate
            state.open = true;
            flushSync();
            editItem.focus();
            dispatchKeyDown(editItem, "Enter");
            flushSync();
            expect(onEdit).toHaveBeenCalledTimes(2);
            expect(state.open).toBe(false);

            state.open = true;
            flushSync();
            editItem.focus();
            dispatchKeyDown(editItem, " ");
            flushSync();
            expect(onEdit).toHaveBeenCalledTimes(3);
            expect(state.open).toBe(false);

            // href item does not double-fire on Enter; click fires once
            state.open = true;
            flushSync();
            docsItem.focus();
            dispatchKeyDown(docsItem, "Enter");
            flushSync();
            expect(onLink).not.toHaveBeenCalled();

            dispatchClick(docsItem);
            flushSync();
            expect(onLink).toHaveBeenCalledTimes(1);
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("renders ContextMenuItemIcon and icon prop on ContextMenuItem", () => {
            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    open: true,
                    items: [
                        { key: "copy-prop", text: "Copy", icon: Copy },
                        { key: "delete-slot", text: "Delete", slotIcon: Trash2 },
                    ],
                },
            });
            flushSync();

            const copyItem = requireItem(container, "copy-prop");
            const deleteItem = requireItem(container, "delete-slot");

            const propSvg = requireElement<SVGSVGElement>(copyItem, "svg.cs-context-menu-item-icon.cs-listbox-item-icon");
            const slotSvg = requireElement<SVGSVGElement>(
                deleteItem,
                "svg.cs-context-menu-item-icon.cs-listbox-item-icon"
            );

            expect(propSvg.getAttribute("aria-hidden")).toBe("true");
            expect(slotSvg.getAttribute("aria-hidden")).toBe("true");

            unmount(instance);
        });

        test("ContextMenuCheckboxItem supports bind:checked, indeterminate, closeOnSelect=false default, closeOnSelect=true, and preventDefault()", () => {
            const onCheckedChange = vi.fn();
            const onCheckboxSelect = vi.fn((e: MouseEvent | KeyboardEvent) => {
                if (preventSelect) e.preventDefault();
            });
            let preventSelect = false;
            const state = $state({
                open: true,
                checked: false,
                indeterminate: false,
                closeOnSelect: false,
                disabled: false,
            });

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    showCheckboxItem: true,
                    onCheckedChange,
                    onCheckboxSelect,
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
                    get checkboxCloseOnSelect() {
                        return state.closeOnSelect;
                    },
                    get checkboxDisabled() {
                        return state.disabled;
                    },
                },
            });
            flushSync();

            const cbItem = requireElement<HTMLDivElement>(container, '[role="menuitemcheckbox"]');
            expect(cbItem.getAttribute("aria-checked")).toBe("false");

            // Click toggles true & keeps menu open
            dispatchClick(cbItem);
            flushSync();
            expect(state.checked).toBe(true);
            expect(cbItem.getAttribute("aria-checked")).toBe("true");
            expect("checked" in cbItem.dataset).toBe(true);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);
            expect(state.open).toBe(true);

            // Enter & Space toggle
            cbItem.focus();
            dispatchKeyDown(cbItem, "Enter");
            flushSync();
            expect(state.checked).toBe(false);
            dispatchKeyDown(cbItem, " ");
            flushSync();
            expect(state.checked).toBe(true);

            // Indeterminate sets aria-checked="mixed"
            state.indeterminate = true;
            flushSync();
            expect(cbItem.getAttribute("aria-checked")).toBe("mixed");
            expect("indeterminate" in cbItem.dataset).toBe(true);

            // Disabled blocks toggle
            state.disabled = true;
            flushSync();
            dispatchClick(cbItem);
            flushSync();
            expect(state.checked).toBe(true);

            // preventDefault blocks toggle
            state.disabled = false;
            preventSelect = true;
            flushSync();
            dispatchClick(cbItem);
            flushSync();
            expect(state.checked).toBe(true);

            // closeOnSelect=true closes on toggle
            preventSelect = false;
            state.closeOnSelect = true;
            flushSync();
            dispatchClick(cbItem);
            flushSync();
            expect(state.checked).toBe(false);
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("ContextMenuRadioGroup + ContextMenuRadioItem support bind:value, aria-checked, idempotency, closeOnSelect=false default, and preventDefault()", () => {
            const onValueChange = vi.fn();
            const onBlockedSelect = vi.fn((e: MouseEvent | KeyboardEvent) => {
                e.preventDefault();
            });
            const state = $state({ open: true, value: "compact" });

            const radioItems: TestContextMenuRadioItem[] = [
                { value: "compact", text: "Compact" },
                { value: "comfortable", text: "Comfortable" },
                { value: "blocked", text: "Blocked", closeOnSelect: true, onSelect: onBlockedSelect },
                { value: "spacious", text: "Spacious", closeOnSelect: true },
                { value: "disabled", text: "Disabled", disabled: true },
            ];

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    radioItems,
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
            const blocked = requireElement<HTMLDivElement>(container, '[role="menuitemradio"][data-value="blocked"]');
            const spacious = requireElement<HTMLDivElement>(container, '[role="menuitemradio"][data-value="spacious"]');
            const disabled = requireElement<HTMLDivElement>(container, '[role="menuitemradio"][data-value="disabled"]');

            expect(compact.getAttribute("aria-checked")).toBe("true");
            expect(comfortable.getAttribute("aria-checked")).toBe("false");

            // Idempotent click on already-selected item
            dispatchClick(compact);
            flushSync();
            expect(onValueChange).not.toHaveBeenCalled();

            // Click selects comfortable & keeps open
            dispatchClick(comfortable);
            flushSync();
            expect(state.value).toBe("comfortable");
            expect(comfortable.getAttribute("aria-checked")).toBe("true");
            expect(compact.getAttribute("aria-checked")).toBe("false");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("comfortable");
            expect(state.open).toBe(true);

            // Space selects compact
            compact.focus();
            dispatchKeyDown(compact, " ");
            flushSync();
            expect(state.value).toBe("compact");
            expect(onValueChange).toHaveBeenCalledTimes(2);

            // Disabled & preventDefault block selection
            dispatchClick(disabled);
            dispatchClick(blocked);
            flushSync();
            expect(onBlockedSelect).toHaveBeenCalledTimes(1);
            expect(state.value).toBe("compact");
            expect(state.open).toBe(true);

            // closeOnSelect=true closes menu
            dispatchClick(spacious);
            flushSync();
            expect(state.value).toBe("spacious");
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("rovingFocus (ArrowDown, ArrowUp, Home, End, looping, typeahead + Space guard) and mouse pointermove nav reset", () => {
            const onRename = vi.fn();
            const state = $state({ open: true });

            const instance = mount(ContextMenuTestHost, {
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
                        { key: "export", label: "Custom Export", text: "Export", shortcut: "⌘E" },
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

            const content = requireContent(container);
            const list = requireListViewport(container);
            const alpha = requireItem(container, "alpha");
            const rename = requireItem(container, "rename");
            const exportItem = requireItem(container, "export");

            expect(rename.dataset.typeaheadLabel).toBe("Rename");
            expect(exportItem.dataset.typeaheadLabel).toBe("Custom Export");

            alpha.focus();
            dispatchKeyDown(alpha, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(rename);
            expect(content.dataset.nav).toBe("keyboard");
            expect("arrowNav" in content.dataset).toBe(true);

            dispatchKeyDown(rename, "End");
            flushSync();
            expect(document.activeElement).toBe(exportItem);

            // Loops from last to first
            dispatchKeyDown(exportItem, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(alpha);

            // Loops from first to last
            dispatchKeyDown(alpha, "ArrowUp");
            flushSync();
            expect(document.activeElement).toBe(exportItem);

            dispatchKeyDown(exportItem, "Home");
            flushSync();
            expect(document.activeElement).toBe(alpha);

            // Description ("Zebra") must not match typeahead
            dispatchKeyDown(alpha, "z");
            flushSync();
            expect(document.activeElement).toBe(alpha);
            vi.advanceTimersByTime(600);

            // Typeahead "r" jumps to Rename; Space while data-typeahead-active is set does NOT activate
            dispatchKeyDown(alpha, "r");
            flushSync();
            expect(document.activeElement).toBe(rename);
            expect("typeaheadActive" in list.dataset).toBe(true);

            dispatchKeyDown(rename, " ");
            flushSync();
            expect(onRename).not.toHaveBeenCalled();
            expect(state.open).toBe(true);

            // Mouse pointermove resets keyboard nav flags and moves focus to listRef
            dispatchPointerEvent(rename, "pointermove", { pointerType: "mouse" });
            flushSync();
            expect("nav" in content.dataset).toBe(false);
            expect("arrowNav" in content.dataset).toBe(false);
            expect(document.activeElement).toBe(list);

            unmount(instance);
        });
    });

    describe("Groups, Separator, Pinned Header/Footer, Toggle Sync, Custom Widgets & FocusOut", () => {
        test("wires ContextMenuGroup aria-labelledby, renders ContextMenuSeparator, pins header/footer, and syncs native toggle close", () => {
            const onOpenChange = vi.fn();
            const state = $state({ open: true });
            const groups: TestContextMenuGroup[] = [
                {
                    key: "g1",
                    label: "Workspace",
                    items: [{ key: "settings", text: "Settings" }],
                },
            ];

            const instance = mount(ContextMenuTestHost, {
                target: container,
                props: {
                    groups,
                    showSeparator: true,
                    pinnedHeaderText: "Pinned Header",
                    pinnedFooterText: "Pinned Footer",
                    scrollableHeaderText: "Scrollable Header",
                    scrollableFooterText: "Scrollable Footer",
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

            const content = requireContent(container);
            const list = requireListViewport(container);
            const scrollArea = requireElement<HTMLElement>(content, ".cs-scroll-area");
            const group = requireElement<HTMLDivElement>(container, '[data-group-key="g1"]');
            const groupLabel = requireElement<HTMLDivElement>(group, ".cs-context-menu-group-label");
            const separator = requireElement<HTMLDivElement>(container, '[role="separator"]');
            const pinnedHeader = requireElement<HTMLDivElement>(content, '[data-testid="pinned-header"]');
            const pinnedFooter = requireElement<HTMLDivElement>(content, '[data-testid="pinned-footer"]');
            const scrollableHeader = requireElement<HTMLDivElement>(list, '[data-testid="scrollable-header"]');
            const scrollableFooter = requireElement<HTMLDivElement>(list, '[data-testid="scrollable-footer"]');

            expect(group.getAttribute("role")).toBe("group");
            expect(groupLabel.id).toBeTruthy();
            expect(group.getAttribute("aria-labelledby")).toBe(groupLabel.id);
            expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
            expect(scrollArea.contains(pinnedHeader)).toBe(false);
            expect(scrollArea.contains(pinnedFooter)).toBe(false);
            expect(list.contains(scrollableHeader)).toBe(true);
            expect(list.contains(scrollableFooter)).toBe(true);

            // Simulate top-layer light dismiss (toggle newState="closed")
            openPopovers.delete(content);
            dispatchToggleEvent(content, "closed", "open");
            flushSync();
            expect(state.open).toBe(false);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);

            unmount(instance);
        });

        test("custom widget key guard preserves Space/ArrowDown/Home/End/typing, Tab on item closes & restores focus, and external focusout closes", () => {
            const state = $state({ open: false });

            const instance = mount(ContextMenuTestHost, {
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

            trigger.focus();
            dispatchContextMenu(trigger, { clientX: 80, clientY: 80 });
            flushSync();

            input.focus();
            for (const key of ["d", " ", "ArrowDown", "Home", "End"]) {
                const ev = dispatchKeyDown(input, key);
                flushSync();
                expect(ev.defaultPrevented).toBe(false);
                expect(document.activeElement).toBe(input);
                expect("nav" in content.dataset).toBe(false);
                expect("arrowNav" in content.dataset).toBe(false);
            }

            // Internal focusout between custom widgets keeps menu open
            input.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: customSwitch }));
            flushSync();
            expect(state.open).toBe(true);

            // Tab on custom widget keeps menu open
            customSwitch.focus();
            dispatchKeyDown(customSwitch, "Tab");
            flushSync();
            expect(state.open).toBe(true);

            // Tab on .cs-context-menu-item (after keyboard open) closes menu & restores focus to trigger
            state.open = false;
            flushSync();
            trigger.focus();
            dispatchKeyDown(trigger, "F10", { shiftKey: true });
            flushSync();
            editItem.focus();
            dispatchKeyDown(editItem, "Tab");
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(trigger);

            // External focusout closes menu without stealing focus back to trigger
            trigger.focus();
            dispatchContextMenu(trigger, { clientX: 80, clientY: 80 });
            flushSync();
            outsideButton.focus();
            content.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideButton }));
            flushSync();
            expect(state.open).toBe(false);
            expect(document.activeElement).toBe(outsideButton);

            unmount(instance);
        });
    });
});
