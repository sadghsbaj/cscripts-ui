import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { TABS_BASELINES, TABS_ORIENTATIONS, TABS_SIZES, TABS_WIDTHS } from "./index.ts";
import TabsTestHost, { type TestTabItem } from "./TabsTestHost.internal.svelte";

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchPointerDown(
    target: EventTarget,
    options: { button?: number; pointerType?: string } = {}
): PointerEvent {
    const event = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: options.button ?? 0,
        pointerType: options.pointerType ?? "mouse",
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchClick(
    target: EventTarget,
    options: {
        button?: number;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        altKey?: boolean;
    } = {}
): MouseEvent {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: options.button ?? 0,
        ctrlKey: options.ctrlKey ?? false,
        metaKey: options.metaKey ?? false,
        shiftKey: options.shiftKey ?? false,
        altKey: options.altKey ?? false,
    });
    target.dispatchEvent(event);
    return event;
}

function setupGeometryMocks(root: ParentNode): void {
    const tablist = root.querySelector<HTMLDivElement>(".cs-tabs-list");
    if (!tablist) throw new Error("Expected .cs-tabs-list");
    Object.defineProperty(tablist, "scrollWidth", { configurable: true, get: () => 300 });

    const positions: Record<string, { left: number; width: number }> = {
        overview: { left: 0, width: 80 },
        details: { left: 90, width: 90 },
        settings: { left: 190, width: 110 },
    };

    for (const [val, pos] of Object.entries(positions)) {
        const el = root.querySelector<HTMLButtonElement | HTMLAnchorElement>(
            `.cs-tabs-trigger[data-value="${CSS.escape(val)}"]`
        );
        if (!el) throw new Error(`Expected trigger "${val}"`);
        Object.defineProperties(el, {
            offsetLeft: { configurable: true, get: () => pos.left },
            offsetWidth: { configurable: true, get: () => pos.width },
        });
    }
}

describe("Tabs Svelte 5 Component", () => {
    let container: HTMLDivElement;

    const defaultItems: TestTabItem[] = [
        { value: "overview", label: "Overview" },
        { value: "details", label: "Details" },
        { value: "settings", label: "Settings" },
    ];

    function getRoot(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-tabs");
        if (!el) throw new Error("Expected .cs-tabs root");
        return el;
    }

    function getListShell(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-tabs-list-shell");
        if (!el) throw new Error("Expected .cs-tabs-list-shell");
        return el;
    }

    function getViewport(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-tabs-viewport");
        if (!el) throw new Error("Expected .cs-tabs-viewport");
        return el;
    }

    function getTablist(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-tabs-list");
        if (!el) throw new Error("Expected .cs-tabs-list");
        return el;
    }

    function getIndicator(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-tabs-indicator");
        if (!el) throw new Error("Expected .cs-tabs-indicator");
        return el;
    }

    function getTrigger(value: string): HTMLButtonElement | HTMLAnchorElement {
        const el = container.querySelector<HTMLButtonElement | HTMLAnchorElement>(
            `.cs-tabs-trigger[data-value="${CSS.escape(value)}"]`
        );
        if (!el) throw new Error(`Expected trigger "${value}"`);
        return el;
    }

    function getPanel(value: string): HTMLDivElement | null {
        return container.querySelector<HTMLDivElement>(`.cs-tabs-panel[data-value="${CSS.escape(value)}"]`);
    }

    function requirePanel(value: string): HTMLDivElement {
        const el = getPanel(value);
        if (!el) throw new Error(`Expected panel "${value}"`);
        return el;
    }

    function getScrollButton(direction: "prev" | "next"): HTMLButtonElement | null {
        return container.querySelector<HTMLButtonElement>(
            `button.cs-tabs-scroll-btn[data-direction="${CSS.escape(direction)}"]`
        );
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("DOM, semantics & variant props", () => {
        test("renders root, tablist, triggers, labels, icons, and binds ref", () => {
            let ref: HTMLDivElement | null = null;
            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    value: "details",
                    items: [
                        { value: "overview", label: "Overview", withIcon: true },
                        { value: "details", label: "Details" },
                    ],
                    get ref() {
                        return ref;
                    },
                    set ref(el) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const root = getRoot();
            expect(ref).toBe(root);
            expect(root.dataset.size).toBe("md");
            expect(root.dataset.orientation).toBe("horizontal");
            expect(root.dataset.width).toBe("content");
            expect(root.dataset.baseline).toBe("full");
            expect("disabled" in root.dataset).toBe(false);

            const tablist = getTablist();
            expect(tablist.getAttribute("role")).toBe("tablist");
            expect(tablist.getAttribute("aria-orientation")).toBe("horizontal");

            const overviewTrigger = getTrigger("overview");
            const icon = overviewTrigger.querySelector(".cs-tabs-icon");
            expect(icon).not.toBeNull();
            expect(icon?.getAttribute("aria-hidden")).toBe("true");
            expect(overviewTrigger.querySelector(".cs-tabs-label")?.textContent).toBe("Overview");

            unmount(instance);
        });

        test("applies all size, orientation, width, and baseline data-* attributes", () => {
            for (const size of TABS_SIZES) {
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: { size, value: "overview", items: defaultItems },
                });
                flushSync();
                expect(getRoot().dataset.size).toBe(size);
                unmount(instance);
            }

            for (const orientation of TABS_ORIENTATIONS) {
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: { orientation, value: "overview", items: defaultItems },
                });
                flushSync();
                expect(getRoot().dataset.orientation).toBe(orientation);
                expect(getTablist().getAttribute("aria-orientation")).toBe(orientation);
                unmount(instance);
            }

            for (const width of TABS_WIDTHS) {
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: { width, value: "overview", items: defaultItems },
                });
                flushSync();
                expect(getRoot().dataset.width).toBe(width);
                unmount(instance);
            }

            for (const baseline of TABS_BASELINES) {
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: { baseline, value: "overview", items: defaultItems },
                });
                flushSync();
                expect(getRoot().dataset.baseline).toBe(baseline);
                unmount(instance);
            }
        });

        test("propagates root disabled and per-trigger disabled without affecting sibling triggers", () => {
            const onValueChange = vi.fn();
            let value = $state<string | undefined>("overview");
            let rootDisabled = $state(false);

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    get disabled() {
                        return rootDisabled;
                    },
                    onValueChange,
                    items: [
                        { value: "overview" },
                        { value: "details", disabled: true },
                        { value: "settings" },
                    ],
                },
            });
            flushSync();

            const overviewBtn = getTrigger("overview") as HTMLButtonElement;
            const detailsBtn = getTrigger("details") as HTMLButtonElement;
            const settingsBtn = getTrigger("settings") as HTMLButtonElement;

            expect(overviewBtn.disabled).toBe(false);
            expect(detailsBtn.disabled).toBe(true);
            expect("disabled" in detailsBtn.dataset).toBe(true);
            expect(settingsBtn.disabled).toBe(false);

            // Clicking disabled trigger does nothing
            dispatchPointerDown(detailsBtn);
            dispatchClick(detailsBtn);
            flushSync();
            expect(value).toBe("overview");
            expect(onValueChange).not.toHaveBeenCalled();

            // Enabling root disabled disables all triggers and blocks selection
            rootDisabled = true;
            flushSync();
            expect("disabled" in getRoot().dataset).toBe(true);
            expect(overviewBtn.disabled).toBe(true);
            expect(settingsBtn.disabled).toBe(true);

            dispatchPointerDown(settingsBtn);
            dispatchClick(settingsBtn);
            flushSync();
            expect(value).toBe("overview");
            expect(onValueChange).not.toHaveBeenCalled();

            // Disabling root disabled restores enabled triggers while keeping per-trigger disabled
            rootDisabled = false;
            flushSync();
            expect(overviewBtn.disabled).toBe(false);
            expect(detailsBtn.disabled).toBe(true);
            expect(settingsBtn.disabled).toBe(false);

            unmount(instance);
        });
    });

    describe("WAI-ARIA & tablist-only mode", () => {
        test("wires aria-selected, aria-controls, role=tabpanel, and aria-labelledby when panels exist", () => {
            let value = $state<string | undefined>("overview");
            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    keepMounted: true,
                    items: defaultItems,
                },
            });
            flushSync();

            const overviewTrigger = getTrigger("overview");
            const detailsTrigger = getTrigger("details");
            const overviewPanel = requirePanel("overview");
            const detailsPanel = requirePanel("details");

            expect(overviewTrigger.getAttribute("role")).toBe("tab");
            expect(overviewTrigger.getAttribute("aria-selected")).toBe("true");
            expect(overviewTrigger.getAttribute("aria-controls")).toBe(overviewPanel.id);
            expect(detailsTrigger.getAttribute("aria-selected")).toBe("false");
            expect(detailsTrigger.getAttribute("aria-controls")).toBe(detailsPanel.id);

            expect(overviewPanel.getAttribute("role")).toBe("tabpanel");
            expect(overviewPanel.getAttribute("aria-labelledby")).toBe(overviewTrigger.id);
            expect(overviewPanel.getAttribute("tabindex")).toBe("0");
            expect(detailsPanel.getAttribute("role")).toBe("tabpanel");
            expect(detailsPanel.getAttribute("aria-labelledby")).toBe(detailsTrigger.id);

            // Switch active tab and verify aria-selected flips
            value = "details";
            flushSync();
            expect(overviewTrigger.getAttribute("aria-selected")).toBe("false");
            expect(detailsTrigger.getAttribute("aria-selected")).toBe("true");

            unmount(instance);
        });

        test("omits aria-controls in tablist-only mode and updates dynamically when panels mount/unmount", () => {
            let withPanels = $state(false);
            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    value: "overview",
                    get withPanels() {
                        return withPanels;
                    },
                    items: defaultItems,
                },
            });
            flushSync();

            const overviewTrigger = getTrigger("overview");
            const detailsTrigger = getTrigger("details");
            expect(overviewTrigger.hasAttribute("aria-controls")).toBe(false);
            expect(detailsTrigger.hasAttribute("aria-controls")).toBe(false);

            // Mount panels dynamically
            withPanels = true;
            flushSync();
            expect(overviewTrigger.getAttribute("aria-controls")).toBe(requirePanel("overview").id);
            expect(detailsTrigger.hasAttribute("aria-controls")).toBe(true);

            // Unmount panels again
            withPanels = false;
            flushSync();
            expect(overviewTrigger.hasAttribute("aria-controls")).toBe(false);

            unmount(instance);
        });
    });

    describe("value binding ($bindable) & strict controlled mode", () => {
        test("syncs bind:value, onValueChange, and external value changes across A -> B -> A without no-op fires", () => {
            let value = $state<string | undefined>("overview");
            const onValueChange = vi.fn();

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            // Clicking already-selected tab is a no-op
            dispatchPointerDown(getTrigger("overview"));
            dispatchClick(getTrigger("overview"));
            flushSync();
            expect(onValueChange).not.toHaveBeenCalled();

            // A -> B via pointer
            dispatchPointerDown(getTrigger("details"));
            flushSync();
            expect(value).toBe("details");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("details");

            // B -> A via external prop update
            value = "overview";
            flushSync();
            expect(getTrigger("overview").getAttribute("aria-selected")).toBe("true");
            expect(getTrigger("details").getAttribute("aria-selected")).toBe("false");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            // A -> settings via keyboard
            getTrigger("overview").focus();
            dispatchKey(getTrigger("overview"), "End");
            flushSync();
            expect(value).toBe("settings");
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("settings");

            unmount(instance);
        });

        test("supports strict controlled mode (read-only getter + no-op setter) without detaching UI", () => {
            const onValueChange = vi.fn();
            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return "overview";
                    },
                    set value(_next) {
                        // Intentionally read-only controlled binding
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            dispatchPointerDown(getTrigger("details"));
            flushSync();

            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith("details");
            expect(getTrigger("overview").getAttribute("aria-selected")).toBe("true");
            expect(getTrigger("details").getAttribute("aria-selected")).toBe("false");

            unmount(instance);
        });
    });

    describe("keyboard navigation (rovingFocus)", () => {
        test("horizontal ArrowLeft/Right, Home/End, disabled skip, and loop=true/false", () => {
            let value = $state<string | undefined>("overview");
            let loop = $state(true);
            const onValueChange = vi.fn();

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    get loop() {
                        return loop;
                    },
                    onValueChange,
                    items: [
                        { value: "overview" },
                        { value: "disabled-tab", disabled: true },
                        { value: "details" },
                        { value: "settings" },
                    ],
                },
            });
            flushSync();

            const tablist = getTablist();
            const overviewBtn = getTrigger("overview");
            const detailsBtn = getTrigger("details");
            const settingsBtn = getTrigger("settings");

            overviewBtn.focus();
            expect("arrowNav" in tablist.dataset).toBe(false);

            // ArrowRight skips disabled-tab -> details
            dispatchKey(overviewBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(detailsBtn);
            expect(value).toBe("details");
            expect("arrowNav" in tablist.dataset).toBe(true);

            // ArrowRight -> settings
            dispatchKey(detailsBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(settingsBtn);
            expect(value).toBe("settings");

            // ArrowRight at end with loop=true wraps to overview
            dispatchKey(settingsBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(overviewBtn);
            expect(value).toBe("overview");

            // ArrowLeft at start with loop=true wraps to settings
            dispatchKey(overviewBtn, "ArrowLeft");
            flushSync();
            expect(document.activeElement).toBe(settingsBtn);
            expect(value).toBe("settings");

            // Home -> overview, End -> settings
            dispatchKey(settingsBtn, "Home");
            flushSync();
            expect(document.activeElement).toBe(overviewBtn);
            expect(value).toBe("overview");

            dispatchKey(overviewBtn, "End");
            flushSync();
            expect(document.activeElement).toBe(settingsBtn);
            expect(value).toBe("settings");

            // With loop=false, ArrowRight at end stays on settings
            loop = false;
            flushSync();
            dispatchKey(settingsBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(settingsBtn);
            expect(value).toBe("settings");

            // focusout leaving tablist clears data-arrow-nav; pointerdown also clears it
            const outsideBtn = document.createElement("button");
            document.body.append(outsideBtn);
            settingsBtn.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideBtn }));
            flushSync();
            expect("arrowNav" in tablist.dataset).toBe(false);
            outsideBtn.remove();

            dispatchKey(settingsBtn, "ArrowLeft");
            flushSync();
            expect("arrowNav" in tablist.dataset).toBe(true);

            dispatchPointerDown(tablist);
            flushSync();
            expect("arrowNav" in tablist.dataset).toBe(false);

            unmount(instance);
        });

        test("vertical orientation responds to ArrowUp/ArrowDown and ignores ArrowLeft/ArrowRight", () => {
            let value = $state<string | undefined>("overview");
            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    orientation: "vertical",
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    items: defaultItems,
                },
            });
            flushSync();

            const overviewBtn = getTrigger("overview");
            const detailsBtn = getTrigger("details");
            const settingsBtn = getTrigger("settings");

            overviewBtn.focus();

            // ArrowRight is ignored in vertical orientation
            dispatchKey(overviewBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(overviewBtn);
            expect(value).toBe("overview");

            // ArrowDown moves to details
            dispatchKey(overviewBtn, "ArrowDown");
            flushSync();
            expect(document.activeElement).toBe(detailsBtn);
            expect(value).toBe("details");

            // ArrowUp wraps to overview
            dispatchKey(detailsBtn, "ArrowUp");
            flushSync();
            expect(document.activeElement).toBe(overviewBtn);
            expect(value).toBe("overview");

            // End moves to settings
            dispatchKey(overviewBtn, "End");
            flushSync();
            expect(document.activeElement).toBe(settingsBtn);
            expect(value).toBe("settings");

            unmount(instance);
        });

        test("activationMode=manual moves focus without selecting until activated via click", () => {
            let value = $state<string | undefined>("overview");
            const onValueChange = vi.fn();

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    activationMode: "manual",
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            const overviewBtn = getTrigger("overview");
            const detailsBtn = getTrigger("details");

            overviewBtn.focus();
            dispatchKey(overviewBtn, "ArrowRight");
            flushSync();

            expect(document.activeElement).toBe(detailsBtn);
            expect(value).toBe("overview");
            expect(onValueChange).not.toHaveBeenCalled();

            // Native Enter/Space on focused <button> triggers click
            dispatchClick(detailsBtn);
            flushSync();
            expect(value).toBe("details");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith("details");

            unmount(instance);
        });
    });

    describe("pointer & touch activation", () => {
        test("desktop primary pointerdown activates immediately; touch defers activation to click", () => {
            let value = $state<string | undefined>("overview");
            const onValueChange = vi.fn();

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            const detailsBtn = getTrigger("details");
            const settingsBtn = getTrigger("settings");

            // Secondary mouse button does not activate
            dispatchPointerDown(detailsBtn, { button: 2, pointerType: "mouse" });
            flushSync();
            expect(value).toBe("overview");
            expect(onValueChange).not.toHaveBeenCalled();

            // Primary mouse pointerdown activates immediately; following click is idempotent
            dispatchPointerDown(detailsBtn, { button: 0, pointerType: "mouse" });
            flushSync();
            expect(value).toBe("details");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            dispatchClick(detailsBtn);
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(1);

            // Touch pointerdown does NOT activate on pointerdown; activates on click
            dispatchPointerDown(settingsBtn, { button: 0, pointerType: "touch" });
            flushSync();
            expect(value).toBe("details");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            dispatchClick(settingsBtn);
            flushSync();
            expect(value).toBe("settings");
            expect(onValueChange).toHaveBeenCalledTimes(2);

            unmount(instance);
        });

        test("respects event.preventDefault() in user onpointerdown and onclick handlers", () => {
            let value = $state<string | undefined>("overview");
            const onValueChange = vi.fn();

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: [
                        { value: "overview" },
                        {
                            value: "details",
                            onpointerdown: (e) => e.preventDefault(),
                            onclick: (e) => e.preventDefault(),
                        },
                    ],
                },
            });
            flushSync();

            const detailsBtn = getTrigger("details");
            dispatchPointerDown(detailsBtn);
            dispatchClick(detailsBtn);
            flushSync();

            expect(value).toBe("overview");
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });
    });

    describe("link tabs (href)", () => {
        test("renders <a> without role=tab, sets aria-current=page, ignores pointerdown & modifier clicks", () => {
            let value = $state<string | undefined>("overview");
            const onValueChange = vi.fn();

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    withPanels: false,
                    items: [
                        { value: "overview", href: "#overview" },
                        { value: "details", href: "#details" },
                        { value: "disabled-link", href: "#disabled", disabled: true },
                    ],
                },
            });
            flushSync();

            const overviewLink = getTrigger("overview") as HTMLAnchorElement;
            const detailsLink = getTrigger("details") as HTMLAnchorElement;
            const disabledLink = getTrigger("disabled-link") as HTMLAnchorElement;

            expect(overviewLink.tagName).toBe("A");
            expect(overviewLink.getAttribute("href")).toBe("#overview");
            expect(overviewLink.hasAttribute("role")).toBe(false);
            expect(overviewLink.getAttribute("aria-current")).toBe("page");
            expect(detailsLink.hasAttribute("aria-current")).toBe(false);

            // pointerdown does not activate link tabs
            dispatchPointerDown(detailsLink);
            flushSync();
            expect(value).toBe("overview");
            expect(onValueChange).not.toHaveBeenCalled();

            // Modifier clicks do not activate link tabs
            for (const mod of [
                { ctrlKey: true },
                { metaKey: true },
                { shiftKey: true },
                { altKey: true },
            ]) {
                dispatchClick(detailsLink, mod);
                flushSync();
                expect(value).toBe("overview");
                expect(onValueChange).not.toHaveBeenCalled();
            }

            // Unmodified primary click selects link tab (preventDefault in test to avoid hash nav side effects)
            const clickEvt = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
            // Note: calling preventDefault before dispatch would trip event.defaultPrevented in handleLinkClick;
            // instead, happy-dom handles hash click without navigation error.
            detailsLink.dispatchEvent(clickEvt);
            flushSync();
            expect(value).toBe("details");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(overviewLink.hasAttribute("aria-current")).toBe(false);
            expect(detailsLink.getAttribute("aria-current")).toBe("page");

            // Disabled link omits href, sets aria-disabled="true", tabindex="-1", and prevents default on click
            expect(disabledLink.hasAttribute("href")).toBe(false);
            expect(disabledLink.getAttribute("aria-disabled")).toBe("true");
            expect(disabledLink.getAttribute("tabindex")).toBe("-1");
            expect("disabled" in disabledLink.dataset).toBe(true);

            const disabledClick = dispatchClick(disabledLink);
            flushSync();
            expect(disabledClick.defaultPrevented).toBe(true);
            expect(value).toBe("details");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });
    });

    describe("TabsPanel keepMounted", () => {
        test("keepMounted=false unmounts inactive panels; keepMounted=true uses native hidden; per-panel override wins", () => {
            let value = $state<string | undefined>("overview");
            let keepMounted = $state(false);

            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    get keepMounted() {
                        return keepMounted;
                    },
                    items: [
                        { value: "overview" },
                        { value: "details", panelKeepMounted: true },
                        { value: "settings", panelKeepMounted: false },
                    ],
                },
            });
            flushSync();

            // Root keepMounted=false: overview (active) mounted, details (override true) mounted+hidden, settings unmounted
            expect(getPanel("overview")?.hidden).toBe(false);
            expect("selected" in requirePanel("overview").dataset).toBe(true);
            expect(requirePanel("details").hidden).toBe(true);
            expect("selected" in requirePanel("details").dataset).toBe(false);
            expect(getPanel("settings")).toBeNull();

            // Switch to details: overview unmounts, details becomes visible
            value = "details";
            flushSync();
            expect(getPanel("overview")).toBeNull();
            expect(requirePanel("details").hidden).toBe(false);
            expect("selected" in requirePanel("details").dataset).toBe(true);

            // Switch root keepMounted=true: overview mounts hidden, settings stays unmounted (override false)
            keepMounted = true;
            flushSync();
            expect(requirePanel("overview").hidden).toBe(true);
            expect(requirePanel("details").hidden).toBe(false);
            expect(getPanel("settings")).toBeNull();

            // Switch to settings: settings mounts visible
            value = "settings";
            flushSync();
            expect(requirePanel("settings").hidden).toBe(false);
            expect(requirePanel("details").hidden).toBe(true);

            unmount(instance);
        });
    });

    describe("WAAPI indicator & overflow chevrons", () => {
        test("calls indicator.animate on tab change and skips animation when prefers-reduced-motion: reduce", () => {
            let reducedMotion = false;
            vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
                matches: query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            }));

            const mockAnim = {
                cancel: vi.fn(),
                addEventListener: vi.fn(),
            } as unknown as Animation;

            const animateSpy = vi.fn(() => mockAnim);
            const originalAnimate = Element.prototype.animate;
            Element.prototype.animate = animateSpy;

            try {
                let value = $state<string | undefined>("overview");
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: {
                        get value() {
                            return value;
                        },
                        set value(next) {
                            value = next;
                        },
                        items: defaultItems,
                    },
                });
                flushSync();

                setupGeometryMocks(container);

                // Trigger a layout sync via value -> details? First sync happens during mount with 0 geometry,
                // so let's re-sync by switching value to details (which measures 0 -> details).
                const indicator = getIndicator();
                expect("active" in indicator.dataset).toBe(true);
                expect(animateSpy).not.toHaveBeenCalled();

                // Move from overview -> details: animate should be called on indicator
                value = "details";
                flushSync();
                expect(animateSpy).toHaveBeenCalledTimes(1);
                expect(animateSpy.mock.instances[0]).toBe(indicator);
                const [keyframes, options] = animateSpy.mock.calls[0] as unknown as [
                    Keyframe[],
                    KeyframeAnimationOptions,
                ];
                expect(keyframes.length).toBe(2);
                expect(options).toMatchObject({
                    duration: 200,
                    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                    fill: "none",
                });
                expect(indicator.style.getPropertyValue("--cs-tabs-clip-start")).toBe("90px");
                expect(indicator.style.getPropertyValue("--cs-tabs-clip-end")).toBe("120px");

                // Enable prefers-reduced-motion: reduce -> no animate call on tab change
                reducedMotion = true;
                value = "settings";
                flushSync();
                expect(animateSpy).toHaveBeenCalledTimes(1);
                expect(indicator.style.getPropertyValue("--cs-tabs-clip-start")).toBe("190px");
                expect(indicator.style.getPropertyValue("--cs-tabs-clip-end")).toBe("0px");

                unmount(instance);
            } finally {
                Element.prototype.animate = originalAnimate;
            }
        });

        test("cancels mid-flight WAAPI animation on A -> B -> C and starts from computed clipPath", () => {
            vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            }));

            const listeners1: Record<string, (() => void) | undefined> = {};
            const anim1 = {
                cancel: vi.fn(),
                addEventListener: vi.fn((type: string, cb: () => void) => {
                    listeners1[type] = cb;
                }),
            } as unknown as Animation;

            const listeners2: Record<string, (() => void) | undefined> = {};
            const anim2 = {
                cancel: vi.fn(),
                addEventListener: vi.fn((type: string, cb: () => void) => {
                    listeners2[type] = cb;
                }),
            } as unknown as Animation;

            const anim3 = {
                cancel: vi.fn(),
                addEventListener: vi.fn(),
            } as unknown as Animation;

            const animateSpy = vi
                .fn()
                .mockReturnValueOnce(anim1)
                .mockReturnValueOnce(anim2)
                .mockReturnValue(anim3);
            const originalAnimate = Element.prototype.animate;
            Element.prototype.animate = animateSpy;

            try {
                let value = $state<string | undefined>("overview");
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: {
                        get value() {
                            return value;
                        },
                        set value(next) {
                            value = next;
                        },
                        items: defaultItems,
                    },
                });
                flushSync();

                setupGeometryMocks(container);
                const indicator = getIndicator();

                // A -> B starts anim1
                value = "details";
                flushSync();
                expect(animateSpy).toHaveBeenCalledTimes(1);
                expect(anim1.cancel).not.toHaveBeenCalled();

                // While anim1 is still in flight, mock getComputedStyle(indicator).clipPath at an intermediate position
                const originalGetComputedStyle = window.getComputedStyle;
                const getComputedStyleSpy = vi
                    .spyOn(window, "getComputedStyle")
                    .mockImplementation((el: Element, pseudo?: string | null) => {
                        if (el === indicator) {
                            return {
                                clipPath: "inset(0px 150px 0px 45px round 9999px)",
                                getPropertyValue: () => "",
                                direction: "ltr",
                            } as unknown as CSSStyleDeclaration;
                        }
                        return originalGetComputedStyle.call(window, el, pseudo);
                    });

                // B -> C mid-flight cancels anim1 and starts anim2 from the intermediate clipPath
                value = "settings";
                flushSync();

                expect(getComputedStyleSpy).toHaveBeenCalledWith(indicator);
                expect(anim1.cancel).toHaveBeenCalledTimes(1);
                expect(animateSpy).toHaveBeenCalledTimes(2);

                const [keyframes2] = animateSpy.mock.calls[1] as unknown as [Keyframe[], KeyframeAnimationOptions];
                expect(keyframes2[0]?.clipPath).toBe("inset(0px 150px 0px 45px round 9999px)");
                expect(keyframes2.at(-1)?.clipPath).toBe("inset(0px 0px 0px 190px round 9999px)");

                // Finishing anim2 clears activeAnimation so subsequent changes do not cancel a finished animation
                listeners2.finish?.();
                value = "overview";
                flushSync();
                expect(anim2.cancel).not.toHaveBeenCalled();

                unmount(instance);
            } finally {
                Element.prototype.animate = originalAnimate;
            }
        });

        test("syncs indicator and overflow on ResizeObserver callback and disconnects on unmount", () => {
            const roCallbacks: ResizeObserverCallback[] = [];
            const observeSpy = vi.fn();
            const disconnectSpy = vi.fn();

            class MockResizeObserver {
                observe = observeSpy;
                unobserve = vi.fn();
                disconnect = disconnectSpy;
                constructor(cb: ResizeObserverCallback) {
                    roCallbacks.push(cb);
                }
            }

            vi.stubGlobal("ResizeObserver", MockResizeObserver);

            try {
                const instance = mount(TabsTestHost, {
                    target: container,
                    props: {
                        value: "details",
                        items: defaultItems,
                    },
                });
                flushSync();

                const roCallback = roCallbacks[0];
                expect(roCallback).toBeDefined();
                if (!roCallback) return;
                expect(observeSpy).toHaveBeenCalledTimes(3);

                const shell = getListShell();
                const viewport = getViewport();
                const indicator = getIndicator();
                const nextBtn = getScrollButton("next");
                expect(nextBtn).not.toBeNull();
                if (!nextBtn) return;

                expect(indicator.style.getPropertyValue("--cs-tabs-clip-start")).toBe("0px");
                expect("overflowing" in shell.dataset).toBe(false);

                // Update geometry and overflow state, then trigger ResizeObserver
                setupGeometryMocks(container);
                Object.defineProperties(viewport, {
                    scrollWidth: { configurable: true, get: () => 400 },
                    clientWidth: { configurable: true, get: () => 200 },
                    scrollLeft: { configurable: true, get: () => 0 },
                });

                roCallback([], {} as ResizeObserver);
                flushSync();

                expect(indicator.style.getPropertyValue("--cs-tabs-clip-start")).toBe("90px");
                expect(indicator.style.getPropertyValue("--cs-tabs-clip-end")).toBe("120px");
                expect("overflowing" in shell.dataset).toBe(true);
                expect("visible" in nextBtn.dataset).toBe(true);

                // Resize active trigger and track again -> indicator re-syncs
                const tablist = getTablist();
                Object.defineProperty(tablist, "scrollWidth", { configurable: true, get: () => 330 });
                Object.defineProperty(getTrigger("details"), "offsetWidth", {
                    configurable: true,
                    get: () => 120,
                });

                roCallback([], {} as ResizeObserver);
                flushSync();

                expect(indicator.style.getPropertyValue("--cs-tabs-clip-start")).toBe("90px");
                expect(indicator.style.getPropertyValue("--cs-tabs-clip-end")).toBe("120px");

                unmount(instance);
                expect(disconnectSpy).toHaveBeenCalledTimes(1);
            } finally {
                vi.unstubAllGlobals();
            }
        });

        test("renders horizontal scroll chevrons based on overflow state and omits them in vertical orientation", () => {
            let orientation = $state<"horizontal" | "vertical">("horizontal");
            const instance = mount(TabsTestHost, {
                target: container,
                props: {
                    get orientation() {
                        return orientation;
                    },
                    value: "overview",
                    items: defaultItems,
                },
            });
            flushSync();

            const shell = getListShell();
            const viewport = getViewport();
            const prevBtn = getScrollButton("prev");
            const nextBtn = getScrollButton("next");

            expect(prevBtn).not.toBeNull();
            expect(nextBtn).not.toBeNull();
            if (!prevBtn || !nextBtn) return;
            expect("overflowing" in shell.dataset).toBe(false);

            const scrollLeft = 40;
            Object.defineProperties(viewport, {
                scrollWidth: { configurable: true, get: () => 400 },
                clientWidth: { configurable: true, get: () => 200 },
                scrollLeft: { configurable: true, get: () => scrollLeft },
            });
            viewport.dispatchEvent(new Event("scroll"));
            flushSync();

            expect("overflowing" in shell.dataset).toBe(true);
            expect("visible" in prevBtn.dataset).toBe(true);
            expect("visible" in nextBtn.dataset).toBe(true);
            expect("scrollPrev" in viewport.dataset).toBe(true);
            expect("scrollNext" in viewport.dataset).toBe(true);

            const scrollBySpy = vi.fn();
            viewport.scrollBy = scrollBySpy;
            viewport.getBoundingClientRect = () =>
                ({ left: 0, right: 200, width: 200, top: 0, bottom: 32, height: 32, x: 0, y: 0 }) as DOMRect;

            nextBtn.click();
            expect(scrollBySpy).toHaveBeenCalledTimes(1);
            expect((scrollBySpy.mock.calls[0]?.[0] as ScrollToOptions).left).toBeGreaterThan(0);

            prevBtn.click();
            expect(scrollBySpy).toHaveBeenCalledTimes(2);
            expect((scrollBySpy.mock.calls[1]?.[0] as ScrollToOptions).left).toBeLessThan(0);

            // Vertical orientation removes scroll chevrons
            orientation = "vertical";
            flushSync();
            expect(getScrollButton("prev")).toBeNull();
            expect(getScrollButton("next")).toBeNull();

            unmount(instance);
        });
    });

    describe("Nested Tabs isolation", () => {
        test("isolates value, rovingFocus, and data-selected when a Tabs instance is nested inside a TabsPanel", () => {
            let outerValue = $state<string | undefined>("overview");
            let innerValue = $state<string | undefined>("overview");

            const outerInstance = mount(TabsTestHost, {
                target: container,
                props: {
                    get value() {
                        return outerValue;
                    },
                    set value(next) {
                        outerValue = next;
                    },
                    keepMounted: true,
                    items: defaultItems,
                },
            });
            flushSync();

            const outerPanelOverview = requirePanel("overview");
            const innerInstance = mount(TabsTestHost, {
                target: outerPanelOverview,
                props: {
                    get value() {
                        return innerValue;
                    },
                    set value(next) {
                        innerValue = next;
                    },
                    items: defaultItems,
                },
            });
            flushSync();

            const outerTriggers = [
                ...getTablist().querySelectorAll<HTMLButtonElement>(".cs-tabs-trigger"),
            ].filter((el) => el.closest(".cs-tabs-list") === getTablist());
            const innerTablist = outerPanelOverview.querySelector<HTMLDivElement>(".cs-tabs-list");
            expect(innerTablist).not.toBeNull();
            if (!innerTablist) return;
            const innerTriggers = [...innerTablist.querySelectorAll<HTMLButtonElement>(".cs-tabs-trigger")];

            expect(outerTriggers).toHaveLength(3);
            expect(innerTriggers).toHaveLength(3);

            const [outer0, outer1, outer2] = outerTriggers;
            const [inner0, inner1] = innerTriggers;
            if (!outer0 || !outer1 || !outer2 || !inner0 || !inner1) return;

            // Inner ArrowRight changes inner value and data-selected without affecting outer
            inner0.focus();
            dispatchKey(inner0, "ArrowRight");
            flushSync();

            expect(innerValue).toBe("details");
            expect(outerValue).toBe("overview");
            expect(document.activeElement).toBe(inner1);
            expect("selected" in inner1.dataset).toBe(true);
            expect("selected" in inner0.dataset).toBe(false);
            expect("selected" in outer0.dataset).toBe(true);
            expect("selected" in outer1.dataset).toBe(false);

            // Outer ArrowRight / End stays within outer triggers and does not affect inner
            outer0.focus();
            dispatchKey(outer0, "ArrowRight");
            flushSync();

            expect(outerValue).toBe("details");
            expect(innerValue).toBe("details");
            expect(document.activeElement).toBe(outer1);
            expect("selected" in outer1.dataset).toBe(true);
            expect("selected" in inner1.dataset).toBe(true);

            // Outer End moves to outer settings, not inner settings
            dispatchKey(outer1, "End");
            flushSync();

            expect(outerValue).toBe("settings");
            expect(innerValue).toBe("details");
            expect(document.activeElement).toBe(outer2);
            expect("selected" in inner1.dataset).toBe(true);

            unmount(innerInstance);
            unmount(outerInstance);
        });
    });
});
