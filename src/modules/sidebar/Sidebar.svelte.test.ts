import { flushSync, mount, unmount } from "svelte";
import type { Attachment } from "svelte/attachments";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    SIDEBAR_ELEMENTS,
    SIDEBAR_SIDES,
    SIDEBAR_SIZES,
    SIDEBAR_VARIANTS,
    type SidebarElement,
    type SidebarSide,
    type SidebarSize,
    type SidebarVariant,
} from "./index.ts";
import SidebarTestHost from "./SidebarTestHost.internal.svelte";

function getRequiredElement<T extends Element>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function dispatchKey(key: string, target: EventTarget = document): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function fireTransitionEnd(target: Element, propertyName: string): void {
    const event = new Event("transitionend", { bubbles: true });
    Object.defineProperty(event, "propertyName", { value: propertyName });
    target.dispatchEvent(event);
}

function dispatchBackdropClick(overlayEl: HTMLElement): void {
    overlayEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    overlayEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

describe("Sidebar Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
        vi.useFakeTimers();
    });

    afterEach(() => {
        container.remove();
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("1. Shell, Variants, Sizes, Widths & Optional Regions", () => {
        test("renders all variant, size, side, and element combinations", () => {
            const state = $state<{
                variant: SidebarVariant;
                size: SidebarSize;
                side: SidebarSide;
                as: SidebarElement;
            }>({
                variant: "elevated",
                size: "sm",
                side: "start",
                as: "aside",
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    get side() {
                        return state.side;
                    },
                    get as() {
                        return state.as;
                    },
                },
            });
            flushSync();

            for (const variant of SIDEBAR_VARIANTS) {
                for (const size of SIDEBAR_SIZES) {
                    for (const side of SIDEBAR_SIDES) {
                        for (const as of SIDEBAR_ELEMENTS) {
                            state.variant = variant;
                            state.size = size;
                            state.side = side;
                            state.as = as;
                            flushSync();

                            const root = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
                            expect(root.tagName.toLowerCase()).toBe(as);
                            expect(root.dataset.variant).toBe(variant);
                            expect(root.dataset.size).toBe(size);
                            expect(root.dataset.side).toBe(side);
                        }
                    }
                }
            }

            unmount(instance);
        });

        test("supports width='fill', custom width/railWidth CSS vars, style merging, ref, class, and aria-label/aria-labelledby", () => {
            let rootRef: HTMLElement | null = null;
            const state = $state<{
                width: "fill" | string | undefined;
                railWidth: string | undefined;
                rootStyle: string | undefined;
                rootRest: Record<string, unknown>;
            }>({
                width: "fill",
                railWidth: undefined,
                rootStyle: undefined,
                rootRest: { "data-testid": "custom-sidebar" },
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    get width() {
                        return state.width;
                    },
                    get railWidth() {
                        return state.railWidth;
                    },
                    get rootStyle() {
                        return state.rootStyle;
                    },
                    get rootRest() {
                        return state.rootRest;
                    },
                    rootClass: ["extra-sidebar", { "cond-sidebar": true }],
                    onRootRef: (el: HTMLElement | null): void => {
                        rootRef = el;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
            expect(rootRef).toBe(root);
            expect(root.dataset.width).toBe("fill");
            expect(root.classList.contains("extra-sidebar")).toBe(true);
            expect(root.classList.contains("cond-sidebar")).toBe(true);
            expect(root.dataset.testid).toBe("custom-sidebar");
            expect(root.getAttribute("aria-label")).toBeTruthy();

            state.width = "300px";
            state.railWidth = "60px";
            state.rootStyle = "z-index: 5";
            state.rootRest = { "aria-labelledby": "ext-heading" };
            flushSync();

            expect("width" in root.dataset).toBe(false);
            expect(root.getAttribute("style")).toContain("z-index: 5; --cs-sidebar-width: 300px; --cs-sidebar-rail-width: 60px;");
            expect(root.hasAttribute("aria-label")).toBe(false);
            expect(root.getAttribute("aria-labelledby")).toBe("ext-heading");

            unmount(instance);
            flushSync();
            expect(rootRef).toBeNull();
        });

        test("all internal regions are 100% optional and render cleanly in arbitrary combinations", () => {
            const state = $state({
                showHeader: false,
                showSubheader: false,
                showBody: false,
                showPinned: false,
                showFooter: false,
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    get showHeader() {
                        return state.showHeader;
                    },
                    get showSubheader() {
                        return state.showSubheader;
                    },
                    get showBody() {
                        return state.showBody;
                    },
                    get showPinned() {
                        return state.showPinned;
                    },
                    get showFooter() {
                        return state.showFooter;
                    },
                },
            });
            flushSync();

            expect(container.querySelector(".cs-sidebar-header")).toBeNull();
            expect(container.querySelector(".cs-sidebar-subheader")).toBeNull();
            expect(container.querySelector(".cs-sidebar-body")).toBeNull();
            expect(container.querySelector(".cs-sidebar-pinned")).toBeNull();
            expect(container.querySelector(".cs-sidebar-footer")).toBeNull();

            state.showPinned = true;
            state.showFooter = true;
            flushSync();
            expect(container.querySelector(".cs-sidebar-pinned")).not.toBeNull();
            expect(container.querySelector(".cs-sidebar-footer")).not.toBeNull();
            expect(container.querySelector(".cs-sidebar-body")).toBeNull();

            state.showHeader = true;
            state.showSubheader = true;
            state.showBody = true;
            flushSync();
            expect(container.querySelector(".cs-sidebar-header")).not.toBeNull();
            expect(container.querySelector(".cs-sidebar-subheader")).not.toBeNull();
            expect(container.querySelector(".cs-sidebar-body")).not.toBeNull();

            unmount(instance);
        });

        test("SidebarBody switches between scrollable ScrollArea and direct flex slot, and forwards fade", () => {
            const state = $state<{
                size: SidebarSize;
                bodyScrollable: boolean;
                bodyFade: boolean | "sm" | "md" | "lg";
            }>({
                size: "md",
                bodyScrollable: true,
                bodyFade: "md",
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    get size() {
                        return state.size;
                    },
                    get bodyScrollable() {
                        return state.bodyScrollable;
                    },
                    get bodyFade() {
                        return state.bodyFade;
                    },
                },
            });
            flushSync();

            const body = getRequiredElement<HTMLDivElement>(container, ".cs-sidebar-body");
            expect("scrollable" in body.dataset).toBe(true);
            const scrollArea = getRequiredElement<HTMLDivElement>(body, ".cs-sidebar-scroll-area");
            expect(scrollArea.dataset.size).toBe("sm");

            state.size = "lg";
            flushSync();
            expect(scrollArea.dataset.size).toBe("md");

            state.bodyScrollable = false;
            flushSync();
            expect("scrollable" in body.dataset).toBe(false);
            expect(body.querySelector(".cs-sidebar-scroll-area")).toBeNull();
            expect(body.querySelector(".cs-sidebar-section")).not.toBeNull();

            unmount(instance);
        });
    });

    describe("2. Collapse & Hide Modes (open, collapseMode, behavior)", () => {
        test("initial mount with open={false} and open={true} starts settled without spurious transitions", () => {
            const closedInstance = mount(SidebarTestHost, {
                target: container,
                props: { open: false, collapseMode: "hidden" },
            });
            flushSync();

            const closedRoot = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
            const closedSurface = getRequiredElement<HTMLDivElement>(closedRoot, ".cs-sidebar-surface");
            expect(closedRoot.dataset.state).toBe("closed");
            expect("open" in closedRoot.dataset).toBe(false);
            expect("animate" in closedRoot.dataset).toBe(false);
            expect(closedSurface.hasAttribute("inert")).toBe(true);

            unmount(closedInstance);

            const openInstance = mount(SidebarTestHost, {
                target: container,
                props: { open: true, collapseMode: "hidden" },
            });
            flushSync();

            const openRoot = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
            const openSurface = getRequiredElement<HTMLDivElement>(openRoot, ".cs-sidebar-surface");
            expect(openRoot.dataset.state).toBe("open");
            expect("open" in openRoot.dataset).toBe(true);
            expect(openSurface.hasAttribute("inert")).toBe(false);

            vi.advanceTimersByTime(20);
            flushSync();
            expect("animate" in openRoot.dataset).toBe(true);

            unmount(openInstance);
        });

        test("collapseMode='hidden' transitions opening/closing, sets inert when closed, and settles on transitionend or fallback", () => {
            const state = $state({ open: true });
            const onOpenChange = vi.fn((next: boolean) => {
                state.open = next;
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    collapseMode: "hidden",
                    showInsideToggle: true,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    onOpenChange,
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);
            flushSync();

            const root = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
            const surface = getRequiredElement<HTMLDivElement>(root, ".cs-sidebar-surface");
            const toggle = getRequiredElement<HTMLButtonElement>(container, '[data-testid="inside-toggle"]');

            toggle.click();
            flushSync();

            expect(state.open).toBe(false);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);
            expect(root.dataset.state).toBe("closing");
            expect(surface.hasAttribute("inert")).toBe(true);

            fireTransitionEnd(root, "inline-size");
            flushSync();
            expect(root.dataset.state).toBe("closed");

            toggle.click();
            flushSync();
            expect(state.open).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(2);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);
            expect(root.dataset.state).toBe("opening");
            expect(surface.hasAttribute("inert")).toBe(false);

            vi.advanceTimersByTime(350);
            flushSync();
            expect(root.dataset.state).toBe("open");

            unmount(instance);
        });

        test("animate={false} and prefers-reduced-motion settle synchronously", () => {
            const state = $state({ open: true, animate: false });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    collapseMode: "hidden",
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get animate() {
                        return state.animate;
                    },
                },
            });
            flushSync();
            vi.advanceTimersByTime(20);
            flushSync();

            const root = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
            expect("animate" in root.dataset).toBe(false);

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closed");

            state.animate = true;
            flushSync();
            vi.spyOn(window, "matchMedia").mockReturnValue({
                matches: true,
                media: "(prefers-reduced-motion: reduce)",
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            } as unknown as MediaQueryList);

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("open");

            unmount(instance);
        });

        test("collapseMode='rail' keeps surface non-inert, handles subheader railBehavior, and preserves group.open across rail collapse/expand", () => {
            const state = $state({
                open: true,
                groupOpen: true,
                subheaderRailBehavior: "collapse" as "collapse" | "keep",
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    collapseMode: "rail",
                    showSubheader: true,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get groupOpen() {
                        return state.groupOpen;
                    },
                    set groupOpen(next: boolean) {
                        state.groupOpen = next;
                    },
                    get subheaderRailBehavior() {
                        return state.subheaderRailBehavior;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLElement>(container, ".cs-sidebar");
            const surface = getRequiredElement<HTMLDivElement>(root, ".cs-sidebar-surface");
            const group = getRequiredElement<HTMLDivElement>(container, '[data-testid="sidebar-group"]');
            const groupTrigger = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="group-trigger"]'
            );
            const subheader = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="sidebar-subheader"]'
            );

            expect(root.dataset.collapseMode).toBe("rail");
            expect("open" in group.dataset).toBe(true);
            expect(groupTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(
                subheader.querySelector<HTMLElement>(".cs-collapsible")?.dataset.state
            ).toBe("open");

            // Collapse sidebar into rail mode
            state.open = false;
            flushSync();

            expect(surface.hasAttribute("inert")).toBe(false);
            expect("open" in group.dataset).toBe(false);
            expect(groupTrigger.getAttribute("aria-expanded")).toBe("false");
            // Bound groupOpen must NOT be mutated!
            expect(state.groupOpen).toBe(true);
            expect(
                subheader.querySelector(".cs-collapsible-inner")?.hasAttribute("inert")
            ).toBe(true);

            // Re-expand sidebar -> group restores its bound open=true state
            state.open = true;
            flushSync();
            expect("open" in group.dataset).toBe(true);
            expect(groupTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(state.groupOpen).toBe(true);

            // Test railBehavior="keep"
            state.subheaderRailBehavior = "keep";
            state.open = false;
            flushSync();
            expect(subheader.dataset.railBehavior).toBe("keep");
            expect(subheader.querySelector(".cs-collapsible")).toBeNull();
            expect(subheader.querySelector('[data-testid="subheader-search"]')).not.toBeNull();

            unmount(instance);
        });

        test("behavior='overlay' mounts Overlay when open, closes on Escape & backdrop click, and preserves open when switching behavior", () => {
            const state = $state<{
                open: boolean;
                behavior: "inline" | "overlay";
                collapseMode: "hidden" | "rail";
            }>({
                open: false,
                behavior: "overlay",
                collapseMode: "rail",
            });
            const onOpenChange = vi.fn((next: boolean) => {
                state.open = next;
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    showOutsideToggle: true,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get behavior() {
                        return state.behavior;
                    },
                    get collapseMode() {
                        return state.collapseMode;
                    },
                    onOpenChange,
                },
            });
            flushSync();

            expect(container.querySelector(".cs-sidebar-overlay")).toBeNull();
            expect(container.querySelector(".cs-sidebar")).toBeNull();

            const outsideToggle = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="outside-toggle"]'
            );
            outsideToggle.focus();
            outsideToggle.click();
            flushSync();

            expect(state.open).toBe(true);
            const overlay = getRequiredElement<HTMLDivElement>(container, ".cs-sidebar-overlay");
            const root = getRequiredElement<HTMLElement>(overlay, ".cs-sidebar");
            expect(root.dataset.behavior).toBe("overlay");
            expect(root.dataset.collapseMode).toBe("hidden");

            // Escape closes overlay
            dispatchKey("Escape", root);
            flushSync();
            expect(state.open).toBe(false);
            expect(onOpenChange).toHaveBeenCalledWith(false);
            expect(container.querySelector(".cs-sidebar-overlay")).toBeNull();

            // Re-open and click backdrop
            state.open = true;
            flushSync();
            const reopenedOverlay = getRequiredElement<HTMLDivElement>(
                container,
                ".cs-sidebar-overlay"
            );
            dispatchBackdropClick(reopenedOverlay);
            flushSync();
            expect(state.open).toBe(false);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);

            // Switching behavior between inline and overlay preserves open
            state.open = true;
            flushSync();
            expect(container.querySelector(".cs-sidebar-overlay")).not.toBeNull();

            state.behavior = "inline";
            flushSync();
            expect(state.open).toBe(true);
            expect(container.querySelector(".cs-sidebar-overlay")).toBeNull();
            expect(getRequiredElement<HTMLElement>(container, ".cs-sidebar").dataset.behavior).toBe(
                "inline"
            );

            state.behavior = "overlay";
            flushSync();
            expect(state.open).toBe(true);
            expect(container.querySelector(".cs-sidebar-overlay")).not.toBeNull();

            unmount(instance);
        });
    });

    describe("3. Sections, Groups, Items, Actions & Toggle", () => {
        test("SidebarSection supports non-collapsible aria-labelledby and collapsible button trigger with header wrapper", () => {
            const state = $state({
                sectionCollapsible: false,
                sectionOpen: true,
                sectionUseHeaderWrapper: false,
                sectionLabelAs: "h3" as "div" | "h2" | "h3" | "h4" | "span",
            });
            const onSectionOpenChange = vi.fn((next: boolean) => {
                state.sectionOpen = next;
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    get sectionCollapsible() {
                        return state.sectionCollapsible;
                    },
                    get sectionOpen() {
                        return state.sectionOpen;
                    },
                    set sectionOpen(next: boolean) {
                        state.sectionOpen = next;
                    },
                    onSectionOpenChange,
                    get sectionUseHeaderWrapper() {
                        return state.sectionUseHeaderWrapper;
                    },
                    get sectionLabelAs() {
                        return state.sectionLabelAs;
                    },
                },
            });
            flushSync();

            const section = getRequiredElement<HTMLElement>(
                container,
                '[data-testid="sidebar-section"]'
            );
            const staticLabel = getRequiredElement<HTMLElement>(
                section,
                '[data-testid="section-label"]'
            );
            expect(staticLabel.tagName.toLowerCase()).toBe("h3");
            expect(section.getAttribute("aria-labelledby")).toBe(staticLabel.id);
            expect("collapsible" in section.dataset).toBe(false);

            state.sectionCollapsible = true;
            state.sectionUseHeaderWrapper = true;
            flushSync();

            const collapsibleSection = getRequiredElement<HTMLElement>(
                container,
                '[data-testid="sidebar-section"]'
            );
            const headerSlot = getRequiredElement<HTMLDivElement>(
                collapsibleSection,
                ".cs-sidebar-section-header-slot"
            );
            const headerWrapper = getRequiredElement<HTMLDivElement>(
                headerSlot,
                '[data-testid="section-header"]'
            );
            const triggerBtn = getRequiredElement<HTMLButtonElement>(
                headerWrapper,
                'button[data-testid="section-label"]'
            );
            const content = getRequiredElement<HTMLDivElement>(
                collapsibleSection,
                ".cs-sidebar-section-content"
            );

            expect(triggerBtn.type).toBe("button");
            expect(triggerBtn.getAttribute("aria-expanded")).toBe("true");
            expect(triggerBtn.getAttribute("aria-controls")).toBe(content.id);
            expect(collapsibleSection.getAttribute("aria-labelledby")).toBe(triggerBtn.id);

            triggerBtn.click();
            flushSync();
            expect(state.sectionOpen).toBe(false);
            expect(onSectionOpenChange).toHaveBeenCalledWith(false);
            expect(triggerBtn.getAttribute("aria-expanded")).toBe("false");

            unmount(instance);
        });

        test("SidebarGroup supports indicator modes, iconOnly split pattern, disabled propagation, and nested depth", () => {
            const state = $state({
                groupOpen: false,
                nestedGroupOpen: false,
                groupDisabled: false,
                groupTriggerDisabled: false,
                groupIndicatorMode: "default" as "default" | "none" | "custom",
                groupTriggerIconOnly: false,
                groupTriggerCurrent: false as boolean | "page",
            });
            const onGroupOpenChange = vi.fn((next: boolean) => {
                state.groupOpen = next;
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    size: "sm",
                    collapseMode: "rail",
                    get groupOpen() {
                        return state.groupOpen;
                    },
                    set groupOpen(next: boolean) {
                        state.groupOpen = next;
                    },
                    onGroupOpenChange,
                    get nestedGroupOpen() {
                        return state.nestedGroupOpen;
                    },
                    set nestedGroupOpen(next: boolean) {
                        state.nestedGroupOpen = next;
                    },
                    get groupDisabled() {
                        return state.groupDisabled;
                    },
                    get groupTriggerDisabled() {
                        return state.groupTriggerDisabled;
                    },
                    get groupIndicatorMode() {
                        return state.groupIndicatorMode;
                    },
                    get groupTriggerIconOnly() {
                        return state.groupTriggerIconOnly;
                    },
                    get groupTriggerCurrent() {
                        return state.groupTriggerCurrent;
                    },
                },
            });
            flushSync();

            const group = getRequiredElement<HTMLDivElement>(container, '[data-testid="sidebar-group"]');
            const trigger = getRequiredElement<HTMLButtonElement>(
                group,
                '[data-testid="group-trigger"]'
            );
            const content = getRequiredElement<HTMLDivElement>(
                group,
                '[data-testid="group-content"]'
            );
            const nestedGroup = getRequiredElement<HTMLDivElement>(
                group,
                ':scope [data-testid="nested-group"]'
            );
            const nestedContent = getRequiredElement<HTMLDivElement>(
                nestedGroup,
                '[data-testid="nested-group-content"]'
            );

            expect(group.dataset.depth).toBe("1");
            expect(nestedGroup.dataset.depth).toBe("2");
            expect(content.getAttribute("style")).toContain("--cs-sidebar-depth: 1;");
            expect(nestedContent.getAttribute("style")).toContain("--cs-sidebar-depth: 2;");
            expect(trigger.querySelector(":scope .cs-sidebar-group-chevron svg")).not.toBeNull();

            // Toggle open
            trigger.click();
            flushSync();
            expect(state.groupOpen).toBe(true);
            expect(onGroupOpenChange).toHaveBeenCalledWith(true);
            expect(trigger.getAttribute("aria-expanded")).toBe("true");

            // Custom indicator snippet
            state.groupIndicatorMode = "custom";
            flushSync();
            expect(
                getRequiredElement(trigger, '[data-testid="custom-group-indicator"]').textContent
            ).toBe("OPEN");

            // Indicator false
            state.groupIndicatorMode = "none";
            flushSync();
            expect(trigger.querySelector(".cs-sidebar-group-chevron")).toBeNull();

            // Disabled group blocks toggle and propagates to nested group
            state.groupDisabled = true;
            flushSync();
            expect(trigger.disabled).toBe(true);
            expect("disabled" in nestedGroup.dataset).toBe(true);
            trigger.click();
            flushSync();
            expect(state.groupOpen).toBe(true);

            // Split iconOnly trigger omits HitArea even in rail mode
            state.groupDisabled = false;
            state.groupTriggerIconOnly = true;
            flushSync();
            const splitTrigger = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="group-trigger"]'
            );
            expect("iconOnly" in splitTrigger.dataset).toBe(true);
            expect(splitTrigger.querySelector(".cs-hit-area")).toBeNull();

            unmount(instance);
        });

        test("SidebarItem polymorphism, current/negative/disabled states, {...rest}/attachment forwarding, rail HitArea, and SidebarItemActions", () => {
            const attached = vi.fn();
            const attachmentCleanup = vi.fn();
            const testAttachment: Attachment<HTMLElement> = (node) => {
                attached(node);
                return attachmentCleanup;
            };
            const onItemClick = vi.fn();
            const onActionClick = vi.fn();

            const state = $state<{
                open: boolean;
                size: SidebarSize;
                itemHref: string | undefined;
                itemCurrent: boolean | "page";
                itemNegative: boolean;
                itemDisabled: boolean;
                actionsAlwaysVisible: boolean;
            }>({
                open: false,
                size: "sm",
                itemHref: undefined,
                itemCurrent: true,
                itemNegative: true,
                itemDisabled: false,
                actionsAlwaysVisible: false,
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    collapseMode: "rail",
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get size() {
                        return state.size;
                    },
                    get itemHref() {
                        return state.itemHref;
                    },
                    get itemCurrent() {
                        return state.itemCurrent;
                    },
                    get itemNegative() {
                        return state.itemNegative;
                    },
                    get itemDisabled() {
                        return state.itemDisabled;
                    },
                    itemAttachment: testAttachment,
                    itemRest: { "data-custom-attr": "yes" },
                    onItemClick,
                    get actionsAlwaysVisible() {
                        return state.actionsAlwaysVisible;
                    },
                    onActionClick,
                },
            });
            flushSync();

            const btnItem = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="primary-item"]'
            );
            expect(btnItem.tagName.toLowerCase()).toBe("button");
            expect(btnItem.type).toBe("button");
            expect(btnItem.getAttribute("aria-current")).toBe("true");
            expect("current" in btnItem.dataset).toBe(true);
            expect("negative" in btnItem.dataset).toBe(true);
            expect(btnItem.dataset.customAttr).toBe("yes");
            expect(attached).toHaveBeenCalledWith(btnItem);
            expect(btnItem.querySelector<HTMLElement>(".cs-hit-area")?.dataset.size).toBe("sm");
            expect(getRequiredElement(btnItem, '[data-testid="item-badge"]').textContent).toBe("12");

            // lg omits HitArea in rail mode
            state.size = "lg";
            flushSync();
            expect(btnItem.querySelector(".cs-hit-area")).toBeNull();

            // expanded omits HitArea
            state.size = "md";
            state.open = true;
            flushSync();
            expect(btnItem.querySelector(".cs-hit-area")).toBeNull();

            // rail md includes HitArea md
            state.open = false;
            flushSync();
            expect(btnItem.querySelector<HTMLElement>(".cs-hit-area")?.dataset.size).toBe("md");

            // Anchor polymorphism + disabled anchor behavior
            state.itemHref = "/home";
            state.itemCurrent = true;
            flushSync();
            const linkItem = getRequiredElement<HTMLAnchorElement>(
                container,
                '[data-testid="primary-item"]'
            );
            expect(linkItem.tagName.toLowerCase()).toBe("a");
            expect(linkItem.getAttribute("href")).toBe("/home");
            expect(linkItem.getAttribute("aria-current")).toBe("page");

            state.itemDisabled = true;
            flushSync();
            expect(linkItem.hasAttribute("href")).toBe(false);
            expect(linkItem.getAttribute("role")).toBe("link");
            expect(linkItem.getAttribute("aria-disabled")).toBe("true");
            expect(linkItem.getAttribute("tabindex")).toBe("-1");
            linkItem.click();
            flushSync();
            expect(onItemClick).not.toHaveBeenCalled();

            // SidebarItemActions sibling button + alwaysVisible
            const actions = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="item-actions"]'
            );
            expect("alwaysVisible" in actions.dataset).toBe(false);
            state.actionsAlwaysVisible = true;
            flushSync();
            expect("alwaysVisible" in actions.dataset).toBe(true);

            getRequiredElement<HTMLButtonElement>(actions, '[data-testid="row-action-btn"]').click();
            expect(onActionClick).toHaveBeenCalledTimes(1);

            unmount(instance);
            expect(attachmentCleanup).toHaveBeenCalled();
        });

        test("SidebarToggle works inside and outside Sidebar with cross-interaction and preventDefault", () => {
            const state = $state({ open: true, side: "start" as SidebarSide, size: "sm" as SidebarSize });
            const onOutsideToggleClick = vi.fn((event: MouseEvent) => {
                if (event.shiftKey) {
                    event.preventDefault();
                }
            });

            const instance = mount(SidebarTestHost, {
                target: container,
                props: {
                    id: "main-nav",
                    showInsideToggle: true,
                    showOutsideToggle: true,
                    outsideToggleIconOnly: false,
                    outsideToggleLabel: "Menu",
                    onOutsideToggleClick,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get side() {
                        return state.side;
                    },
                    get size() {
                        return state.size;
                    },
                },
            });
            flushSync();

            const insideToggle = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="inside-toggle"]'
            );
            const outsideToggle = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="outside-toggle"]'
            );

            expect(insideToggle.getAttribute("aria-controls")).toBe("main-nav");
            expect(outsideToggle.getAttribute("aria-controls")).toBe("main-nav");
            expect(insideToggle.dataset.size).toBe("xs");
            expect(insideToggle.querySelector<HTMLElement>(".cs-hit-area")?.dataset.size).toBe("sm");
            expect(outsideToggle.querySelector(".cs-button-label")?.textContent).toBe("Menu");

            // Inside -> Outside cross-sync
            insideToggle.click();
            flushSync();
            expect(state.open).toBe(false);
            expect(insideToggle.getAttribute("aria-expanded")).toBe("false");
            expect(outsideToggle.getAttribute("aria-expanded")).toBe("false");

            // Prevented click on outside toggle does not mutate open
            outsideToggle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
            flushSync();
            expect(state.open).toBe(false);

            // Outside -> Inside cross-sync
            outsideToggle.click();
            flushSync();
            expect(state.open).toBe(true);
            expect(insideToggle.getAttribute("aria-expanded")).toBe("true");
            expect(outsideToggle.getAttribute("aria-expanded")).toBe("true");

            unmount(instance);
        });
    });
});
