import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { SidebarViewDirection, SidebarViewInitialFocus, SidebarViewTransition } from "./index.ts";
import SidebarViewsTestHost from "./SidebarViewsTestHost.internal.svelte";

function getRequiredElement<T extends Element>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function fireTransitionEnd(target: Element, propertyName: string): void {
    const event = new Event("transitionend", { bubbles: true });
    Object.defineProperty(event, "propertyName", { value: propertyName });
    target.dispatchEvent(event);
}

describe("SidebarViews & SidebarView Svelte 5 Components", () => {
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

    test("mounts active view only when keepMounted={false}, wires region/aria-label, and resolves forward/backward direction", () => {
        const state = $state<{
            value: "root" | "settings" | "account" | "empty";
            direction: SidebarViewDirection;
        }>({
            value: "root",
            direction: "auto",
        });

        const instance = mount(SidebarViewsTestHost, {
            target: container,
            props: {
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
                get direction() {
                    return state.direction;
                },
            },
        });
        flushSync();
        vi.advanceTimersByTime(20);
        flushSync();

        const viewsRoot = getRequiredElement<HTMLDivElement>(container, '[data-testid="sidebar-views"]');
        expect(viewsRoot.dataset.transition).toBe("slide");
        expect(viewsRoot.dataset.direction).toBe("forward");
        expect("animate" in viewsRoot.dataset).toBe(true);

        const rootView = getRequiredElement<HTMLDivElement>(container, '[data-testid="view-root"]');
        expect(rootView.getAttribute("role")).toBe("region");
        expect(rootView.getAttribute("aria-label")).toBe("Main Menu");
        expect(rootView.dataset.viewState).toBe("active");
        expect("active" in rootView.dataset).toBe(true);
        expect(rootView.hasAttribute("inert")).toBe(false);
        expect(container.querySelector('[data-testid="view-settings"]')).toBeNull();

        // Navigate forward: root -> settings
        getRequiredElement<HTMLButtonElement>(container, '[data-testid="go-settings-btn"]').click();
        flushSync();

        expect(state.value).toBe("settings");
        expect(viewsRoot.dataset.direction).toBe("forward");

        const settingsView = getRequiredElement<HTMLDivElement>(
            container,
            '[data-testid="view-settings"]'
        );
        expect(settingsView.dataset.viewState).toBe("entering");
        expect(rootView.dataset.viewState).toBe("exiting");
        expect(rootView.getAttribute("aria-hidden")).toBe("true");
        expect(rootView.hasAttribute("inert")).toBe(true);

        // Next frame settles entering -> active
        vi.advanceTimersByTime(20);
        flushSync();
        expect(settingsView.dataset.viewState).toBe("active");

        // transitionend unmounts outgoing view
        fireTransitionEnd(rootView, "translate");
        flushSync();
        expect(container.querySelector('[data-testid="view-root"]')).toBeNull();

        // Navigate backward: settings -> root
        getRequiredElement<HTMLButtonElement>(container, '[data-testid="back-root-btn"]').click();
        flushSync();
        expect(state.value).toBe("root");
        expect(viewsRoot.dataset.direction).toBe("backward");

        // Fallback timer unmounts outgoing settings view if transitionend doesn't fire
        vi.advanceTimersByTime(250);
        flushSync();
        expect(container.querySelector('[data-testid="view-settings"]')).toBeNull();

        unmount(instance);
    });

    test("keepMounted={true} keeps all views in DOM with idle state, inert, and aria-hidden", () => {
        const state = $state<{ value: "root" | "settings" | "account" | "empty" }>({
            value: "root",
        });

        const instance = mount(SidebarViewsTestHost, {
            target: container,
            props: {
                keepMounted: true,
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
            },
        });
        flushSync();
        vi.advanceTimersByTime(20);
        flushSync();

        const rootView = getRequiredElement<HTMLDivElement>(container, '[data-testid="view-root"]');
        const settingsView = getRequiredElement<HTMLDivElement>(
            container,
            '[data-testid="view-settings"]'
        );
        const accountView = getRequiredElement<HTMLDivElement>(
            container,
            '[data-testid="view-account"]'
        );

        expect(rootView.dataset.viewState).toBe("active");
        expect(settingsView.dataset.viewState).toBe("idle");
        expect(settingsView.hasAttribute("inert")).toBe(true);
        expect(settingsView.getAttribute("aria-hidden")).toBe("true");
        expect(accountView.dataset.viewState).toBe("idle");
        expect(accountView.hasAttribute("inert")).toBe(true);

        state.value = "settings";
        flushSync();
        vi.advanceTimersByTime(250);
        flushSync();

        expect(settingsView.dataset.viewState).toBe("active");
        expect(settingsView.hasAttribute("inert")).toBe(false);
        expect(rootView.dataset.viewState).toBe("idle");
        expect(rootView.hasAttribute("inert")).toBe(true);

        unmount(instance);
    });

    test("focus handoff moves focus with preventScroll when focus was inside outgoing view, and skips when outside", () => {
        const state = $state<{
            value: "root" | "settings" | "account" | "empty";
            settingsInitialFocus: SidebarViewInitialFocus;
        }>({
            value: "root",
            settingsInitialFocus: "auto",
        });

        const instance = mount(SidebarViewsTestHost, {
            target: container,
            props: {
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
                get settingsInitialFocus() {
                    return state.settingsInitialFocus;
                },
            },
        });
        flushSync();
        vi.advanceTimersByTime(20);
        flushSync();

        // Focus outside -> switching view should NOT steal focus
        const outsideBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="outside-btn"]'
        );
        outsideBtn.focus();
        outsideBtn.click();
        flushSync();
        expect(state.value).toBe("settings");
        expect(document.activeElement).toBe(outsideBtn);

        vi.advanceTimersByTime(250);
        flushSync();

        // Focus inside settings -> navigate forward to account (has [data-autofocus] on input)
        const goAccountBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="go-account-btn"]'
        );
        goAccountBtn.focus();
        goAccountBtn.click();
        flushSync();

        const accountInput = getRequiredElement<HTMLInputElement>(
            container,
            '[data-testid="account-input"]'
        );
        expect(document.activeElement).toBe(accountInput);

        vi.advanceTimersByTime(250);
        flushSync();

        // Navigate back to settings -> focuses first focusable button (back-root-btn)
        const accountBackBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="account-back-btn"]'
        );
        accountBackBtn.focus();
        accountBackBtn.click();
        flushSync();

        const backRootBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="back-root-btn"]'
        );
        expect(document.activeElement).toBe(backRootBtn);

        vi.advanceTimersByTime(250);
        flushSync();

        // Navigate to root, then to empty view -> focuses view container with tabindex="-1"
        backRootBtn.click();
        flushSync();
        vi.advanceTimersByTime(250);
        flushSync();

        const goEmptyBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="go-empty-btn"]'
        );
        goEmptyBtn.focus();
        goEmptyBtn.click();
        flushSync();

        const emptyView = getRequiredElement<HTMLDivElement>(container, '[data-testid="view-empty"]');
        expect(emptyView.getAttribute("tabindex")).toBe("-1");
        expect(document.activeElement).toBe(emptyView);

        unmount(instance);
    });

    test("focus handoff with keepMounted={true} moves focus with preventScroll when focus was inside outgoing view", () => {
        const state = $state<{
            value: "root" | "settings" | "account" | "empty";
        }>({
            value: "root",
        });

        const instance = mount(SidebarViewsTestHost, {
            target: container,
            props: {
                keepMounted: true,
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
            },
        });
        flushSync();
        vi.advanceTimersByTime(20);
        flushSync();

        const goSettingsBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="go-settings-btn"]'
        );
        goSettingsBtn.focus();
        goSettingsBtn.click();
        flushSync();

        const backRootBtn = getRequiredElement<HTMLButtonElement>(
            container,
            '[data-testid="back-root-btn"]'
        );
        expect(document.activeElement).toBe(backRootBtn);

        unmount(instance);
    });

    test("transition='none' and animate={false} switch views synchronously without exiting stage", () => {
        const state = $state<{
            value: "root" | "settings" | "account" | "empty";
            transition: SidebarViewTransition;
            animate: boolean;
        }>({
            value: "root",
            transition: "none",
            animate: true,
        });

        const instance = mount(SidebarViewsTestHost, {
            target: container,
            props: {
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
                get transition() {
                    return state.transition;
                },
                get animate() {
                    return state.animate;
                },
            },
        });
        flushSync();
        vi.advanceTimersByTime(20);
        flushSync();

        const viewsRoot = getRequiredElement<HTMLDivElement>(container, '[data-testid="sidebar-views"]');
        expect("animate" in viewsRoot.dataset).toBe(false);

        state.value = "settings";
        flushSync();
        expect(container.querySelector('[data-testid="view-root"]')).toBeNull();
        expect(
            getRequiredElement<HTMLDivElement>(container, '[data-testid="view-settings"]').dataset
                .viewState
        ).toBe("active");

        state.transition = "fade";
        state.animate = false;
        flushSync();
        expect("animate" in viewsRoot.dataset).toBe(false);

        state.value = "root";
        flushSync();
        expect(container.querySelector('[data-testid="view-settings"]')).toBeNull();
        expect(
            getRequiredElement<HTMLDivElement>(container, '[data-testid="view-root"]').dataset
                .viewState
        ).toBe("active");

        unmount(instance);
    });
});
