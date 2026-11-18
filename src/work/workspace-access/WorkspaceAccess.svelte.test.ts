import type { Component } from "svelte";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    WORKSPACE_ACCESS_DOT_STATUS_MAP,
    WORKSPACE_ACCESS_STATUSES,
    WorkWorkspaceGate,
    WorkWorkspaceMenu,
    type WorkspaceAccessStatus,
} from "./index.ts";

const openPopovers = new WeakSet<HTMLElement>();
const stubbedElements = new WeakSet<HTMLElement>();

function ensurePopoverStub(el: HTMLElement): HTMLElement {
    if (stubbedElements.has(el)) return el;
    stubbedElements.add(el);

    const originalMatches = el.matches.bind(el);
    el.matches = ((selector: string) =>
        selector === ":popover-open" ? openPopovers.has(el) : originalMatches(selector)) as typeof el.matches;

    Object.defineProperties(el, {
        showPopover: {
            configurable: true,
            value: vi.fn(() => {
                openPopovers.add(el);
            }),
        },
        hidePopover: {
            configurable: true,
            value: vi.fn(() => {
                openPopovers.delete(el);
            }),
        },
    });

    return el;
}

function dispatchKey(
    key: string,
    options: KeyboardEventInit = {},
    target: EventTarget = document,
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    target.dispatchEvent(event);
    return event;
}

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Expected element matching "${selector}"`);
    return el;
}

function getButtonByText(root: ParentNode, text: string): HTMLButtonElement | undefined {
    return [...root.querySelectorAll<HTMLButtonElement>("button")].find(
        (btn) => btn.textContent?.trim() === text,
    );
}

function mustGetButtonByText(root: ParentNode, text: string): HTMLButtonElement {
    const btn = getButtonByText(root, text);
    if (!btn) throw new Error(`Expected button with text "${text}"`);
    return btn;
}

function mountReactive<
    TProps extends object,
    TExports extends Record<string, unknown>,
    TBindings extends "" | keyof TProps = "" | keyof TProps,
>(
    component: Component<TProps, TExports, TBindings>,
    target: HTMLElement,
    instances: Array<Record<string, unknown>>,
    initialProps: NoInfer<TProps>,
): {
    instance: TExports;
    update: (next: Partial<NoInfer<TProps>>) => void;
} {
    const props = $state(initialProps);
    const instance = mount(component, {
        target,
        props,
    });
    instances.push(instance as Record<string, unknown>);
    flushSync();

    return {
        instance,
        update(next: Partial<NoInfer<TProps>>): void {
            Object.assign(props, next);
            flushSync();
        },
    };
}

describe("workspace-access", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        vi.useFakeTimers();

        const origGetById = document.getElementById.bind(document);
        vi.spyOn(document, "getElementById").mockImplementation((id: string) => {
            const el = origGetById(id);
            return el ? ensurePopoverStub(el) : null;
        });

        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(async () => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;

        await Promise.resolve();
        vi.advanceTimersByTime(500);
        vi.clearAllTimers();

        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe("WORKSPACE_ACCESS_DOT_STATUS_MAP", () => {
        test("maps all 6 WorkspaceAccessStatus values to semantic WorkAppStatusColor values", () => {
            expect(WORKSPACE_ACCESS_STATUSES).toEqual([
                "unlinked",
                "restoring",
                "needs-permission",
                "ready",
                "stale",
                "unsupported",
            ]);

            expect(WORKSPACE_ACCESS_DOT_STATUS_MAP).toEqual({
                ready: "positive",
                restoring: "caution",
                "needs-permission": "caution",
                unlinked: "negative",
                stale: "negative",
                unsupported: "negative",
            });
        });
    });

    describe("WorkWorkspaceGate", () => {
        test("renders nothing when status === 'ready' and mounts/unmounts dynamically on status transitions", () => {
            let gateRef: HTMLDivElement | null = null;
            const { update } = mountReactive(WorkWorkspaceGate, container, instances, {
                status: "ready" satisfies WorkspaceAccessStatus,
                get ref() {
                    return gateRef;
                },
                set ref(el: HTMLDivElement | null) {
                    gateRef = el;
                },
            });

            expect(container.querySelector(".cs-work-workspace-gate")).toBeNull();
            expect(container.querySelector('[role="dialog"]')).toBeNull();
            expect(gateRef).toBeNull();

            // Transition ready -> unlinked mounts the gate
            update({ status: "unlinked" });
            expect(container.querySelector('[role="dialog"]')).not.toBeNull();
            expect(gateRef).not.toBeNull();

            // Transition unlinked -> ready unmounts the gate cleanly
            update({ status: "ready" });
            expect(container.querySelector('[role="dialog"]')).toBeNull();
        });

        test("renders A11y dialog attributes, info trigger aria-label, and popover wiring", () => {
            mountReactive(WorkWorkspaceGate, container, instances, { status: "unlinked" });

            const dialog = container.querySelector<HTMLDivElement>(".cs-work-workspace-gate");
            expect(dialog).not.toBeNull();
            expect(dialog?.getAttribute("role")).toBe("dialog");
            expect(dialog?.getAttribute("aria-modal")).toBe("true");

            const labelledBy = dialog?.getAttribute("aria-labelledby");
            const describedBy = dialog?.getAttribute("aria-describedby");
            expect(labelledBy).toBeTruthy();
            expect(describedBy).toBeTruthy();

            const titleEl = labelledBy ? document.getElementById(labelledBy) : null;
            const descEl = describedBy ? document.getElementById(describedBy) : null;
            expect(titleEl?.classList.contains("cs-work-workspace-gate-title")).toBe(true);
            expect(descEl?.classList.contains("cs-work-workspace-gate-description")).toBe(true);

            const infoTrigger = container.querySelector<HTMLButtonElement>(
                ".cs-work-workspace-gate-info-trigger",
            );
            const infoPopover = container.querySelector<HTMLDivElement>(
                ".cs-work-workspace-gate-info",
            );
            expect(infoTrigger).not.toBeNull();
            expect(infoPopover).not.toBeNull();
            expect(infoTrigger?.getAttribute("aria-label")).toBe("Why is this permission needed?");
            expect(infoPopover?.id).toBeTruthy();
            expect(infoTrigger?.getAttribute("popovertarget")).toBe(infoPopover?.id);
        });

        test("renders expected stage, copy, folder pill, and actions across all visible states", () => {
            const onselect = vi.fn();
            const ongrant = vi.fn();

            const { update } = mountReactive(WorkWorkspaceGate, container, instances, {
                status: "unlinked",
                directoryName: "ignored-in-unlinked",
                onselect,
                ongrant,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-gate");
            expect(dialog.dataset.status).toBe("unlinked");
            expect(container.querySelector(".cs-work-workspace-gate-stage")).not.toBeNull();
            expect(container.querySelector(".cs-work-workspace-gate-title")?.textContent?.trim()).toBe(
                "Select workspace folder",
            );
            expect(
                container.querySelector(".cs-work-workspace-gate-description")?.textContent?.trim(),
            ).toBe("Choose a local folder where your data is stored safely.");
            expect(container.querySelector(".cs-work-workspace-folder-pill")).toBeNull();

            const selectBtn = getButtonByText(container, "Select folder");
            expect(selectBtn).toBeDefined();
            selectBtn?.click();
            expect(onselect).toHaveBeenCalledTimes(1);
            expect(ongrant).not.toHaveBeenCalled();

            // appName customizes unlinked description
            update({ appName: "Holzanalysen" });
            expect(
                container.querySelector(".cs-work-workspace-gate-description")?.textContent?.trim(),
            ).toBe("Choose a local folder where data for Holzanalysen is stored safely.");

            // needs-permission with directoryName
            update({ status: "needs-permission", directoryName: "  Projekt-Daten  " });
            expect(dialog.dataset.status).toBe("needs-permission");
            expect(container.querySelector(".cs-work-workspace-gate-title")?.textContent?.trim()).toBe(
                "Grant folder access",
            );
            expect(
                container.querySelector(".cs-work-workspace-folder-pill-name")?.textContent?.trim(),
            ).toBe("Projekt-Daten");

            const grantBtn = getButtonByText(container, "Grant access");
            const changeBtn = getButtonByText(container, "Change");
            expect(grantBtn).toBeDefined();
            expect(changeBtn).toBeDefined();
            grantBtn?.click();
            expect(ongrant).toHaveBeenCalledTimes(1);
            changeBtn?.click();
            expect(onselect).toHaveBeenCalledTimes(2);

            // needs-permission hides pill when directoryName is empty/whitespace
            update({ directoryName: " ".repeat(3) });
            expect(container.querySelector(".cs-work-workspace-folder-pill")).toBeNull();

            // stale with directoryName
            update({ status: "stale", directoryName: "Archiv" });
            expect(dialog.dataset.status).toBe("stale");
            expect(container.querySelector(".cs-work-workspace-gate-title")?.textContent?.trim()).toBe(
                "Folder unavailable",
            );
            expect(
                container.querySelector(".cs-work-workspace-folder-pill-name")?.textContent?.trim(),
            ).toBe("Archiv");
            const selectAgainBtn = getButtonByText(container, "Select again");
            expect(selectAgainBtn).toBeDefined();
            selectAgainBtn?.click();
            expect(onselect).toHaveBeenCalledTimes(3);

            // unsupported: no action buttons
            update({ status: "unsupported", directoryName: "Archiv" });
            expect(dialog.dataset.status).toBe("unsupported");
            expect(container.querySelector(".cs-work-workspace-gate-title")?.textContent?.trim()).toBe(
                "Browser not supported",
            );
            expect(container.querySelector(".cs-work-workspace-folder-pill")).toBeNull();
            expect(container.querySelector(".cs-work-workspace-gate-actions")).toBeNull();

            // restoring: spinner and no action buttons
            update({ status: "restoring" });
            expect(dialog.dataset.status).toBe("restoring");
            expect(container.querySelector(".cs-work-workspace-gate-title")?.textContent?.trim()).toBe(
                "Restoring workspace...",
            );
            expect(container.querySelector(".cs-work-workspace-gate-spinner")).not.toBeNull();
            expect(container.querySelector(".cs-work-workspace-gate-actions")).toBeNull();
        });

        test("renders inline errorMessage with role='alert' only when non-empty", () => {
            const { update } = mountReactive(WorkWorkspaceGate, container, instances, {
                status: "unlinked",
                errorMessage: null,
            });

            expect(container.querySelector('[role="alert"]')).toBeNull();

            update({ errorMessage: " ".repeat(3) });
            expect(container.querySelector('[role="alert"]')).toBeNull();

            update({ errorMessage: "  Permission denied by user  " });
            const alert = container.querySelector<HTMLElement>('[role="alert"]');
            expect(alert).not.toBeNull();
            expect(alert?.textContent?.trim()).toBe("Permission denied by user");

            update({ errorMessage: null });
            expect(container.querySelector('[role="alert"]')).toBeNull();
        });

        test("disables action buttons, sets data-busy, and blocks callbacks when busy={true}", () => {
            const onselect = vi.fn();
            const ongrant = vi.fn();
            const { update } = mountReactive(WorkWorkspaceGate, container, instances, {
                status: "needs-permission",
                busy: true,
                onselect,
                ongrant,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-gate");
            expect("busy" in dialog.dataset).toBe(true);

            const grantBtn = mustGetButtonByText(container, "Grant access");
            const changeBtn = mustGetButtonByText(container, "Change");
            expect(grantBtn.disabled).toBe(true);
            expect(changeBtn.disabled).toBe(true);

            grantBtn.click();
            changeBtn.click();
            expect(ongrant).not.toHaveBeenCalled();
            expect(onselect).not.toHaveBeenCalled();

            update({ busy: false });
            expect("busy" in dialog.dataset).toBe(false);
            expect(grantBtn.disabled).toBe(false);
            expect(changeBtn.disabled).toBe(false);

            grantBtn.click();
            expect(ongrant).toHaveBeenCalledTimes(1);
        });

        test("nudge() sets data-blocked, clears after timeout or self animationend, and restarts on repeated calls", () => {
            const { instance } = mountReactive(WorkWorkspaceGate, container, instances, {
                status: "unlinked",
            });
            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-gate");
            const title = mustQuery<HTMLElement>(container, ".cs-work-workspace-gate-title");

            expect("blocked" in dialog.dataset).toBe(false);

            (instance as unknown as { nudge: () => void }).nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Child animationend bubbling up must NOT clear data-blocked
            title.dispatchEvent(new Event("animationend", { bubbles: true }));
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Repeated nudge clears data-blocked synchronously, re-applies on next rAF, and resets 320ms timer
            vi.advanceTimersByTime(200);
            flushSync();
            (instance as unknown as { nudge: () => void }).nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            vi.advanceTimersByTime(20);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Still active 200ms after restart (would have expired at 320ms without reset)
            vi.advanceTimersByTime(200);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Self animationend clears data-blocked immediately
            dialog.dispatchEvent(new Event("animationend", { bubbles: true }));
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            // Timeout also clears data-blocked cleanly
            (instance as unknown as { nudge: () => void }).nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);
            vi.advanceTimersByTime(320);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);
        });

        test("Escape closes open info popover via hidePopover() without nudging, and nudges when info popover is closed", () => {
            mountReactive(WorkWorkspaceGate, container, instances, { status: "unlinked" });
            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-gate");
            const infoPopover = mustQuery<HTMLDivElement>(
                container,
                ".cs-work-workspace-gate-info",
            );
            ensurePopoverStub(infoPopover);

            // Open info popover -> Escape closes it via hidePopover() and does NOT nudge the gate
            openPopovers.add(infoPopover);
            dispatchKey("Escape");
            flushSync();
            expect(infoPopover.hidePopover).toHaveBeenCalledTimes(1);
            expect(infoPopover.matches(":popover-open")).toBe(false);
            expect("blocked" in dialog.dataset).toBe(false);

            // Info popover is now closed -> Escape prevents default and nudges the gate
            const closedEscape = dispatchKey("Escape");
            flushSync();
            expect(closedEscape.defaultPrevented).toBe(true);
            expect("blocked" in dialog.dataset).toBe(true);
        });
    });

    describe("WorkWorkspaceMenu", () => {
        test("renders semantic dot, status label, folder box/fallback, and state-specific actions across all 6 statuses", () => {
            const onselect = vi.fn();
            const ongrant = vi.fn();
            const ondisconnect = vi.fn();

            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu",
                status: "ready" satisfies WorkspaceAccessStatus,
                directoryName: "Kundenordner",
                onselect,
                ongrant,
                ondisconnect,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            expect(menu.getAttribute("role")).toBe("region");
            expect(menu.getAttribute("aria-label")).toBe("Workspace folder");
            expect(menu.getAttribute("popover")).toBe("auto");
            ensurePopoverStub(menu);

            // 1. ready with directoryName
            expect(menu.dataset.status).toBe("ready");
            expect(menu.dataset.dotStatus).toBe("positive");
            expect(menu.querySelector(".cs-work-workspace-menu-status-label")?.textContent?.trim()).toBe(
                "Selected",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Kundenordner",
            );
            expect(getButtonByText(menu, "Change")).toBeDefined();
            expect(getButtonByText(menu, "Disconnect")).toBeDefined();

            // ready fallback when directoryName is omitted
            update({ directoryName: null });
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Selected folder",
            );

            // 2. needs-permission
            update({ status: "needs-permission", directoryName: "Holz-DB" });
            expect(menu.dataset.status).toBe("needs-permission");
            expect(menu.dataset.dotStatus).toBe("caution");
            expect(menu.querySelector(".cs-work-workspace-menu-status-label")?.textContent?.trim()).toBe(
                "Permission required",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Holz-DB",
            );
            expect(getButtonByText(menu, "Grant access")).toBeDefined();
            expect(getButtonByText(menu, "Change")).toBeDefined();
            expect(getButtonByText(menu, "Disconnect")).toBeDefined();

            // needs-permission fallback when directoryName is omitted
            update({ directoryName: null });
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "No folder selected",
            );

            // 3. stale
            update({ status: "stale", directoryName: "Alter-Ordner" });
            expect(menu.dataset.status).toBe("stale");
            expect(menu.dataset.dotStatus).toBe("negative");
            expect(menu.querySelector(".cs-work-workspace-menu-status-label")?.textContent?.trim()).toBe(
                "Folder unavailable",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Alter-Ordner",
            );
            expect(getButtonByText(menu, "Select again")).toBeDefined();
            expect(getButtonByText(menu, "Disconnect")).toBeDefined();

            // 4. unlinked
            update({ status: "unlinked" });
            expect(menu.dataset.status).toBe("unlinked");
            expect(menu.dataset.dotStatus).toBe("negative");
            expect(menu.querySelector(".cs-work-workspace-menu-status-label")?.textContent?.trim()).toBe(
                "No folder selected",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-folder")).toBeNull();
            expect(menu.querySelector(".cs-work-workspace-menu-hint")?.textContent?.trim()).toBe(
                "Please select a workspace folder.",
            );
            expect(getButtonByText(menu, "Select folder")).toBeDefined();
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();

            // 5. restoring
            update({ status: "restoring" });
            expect(menu.dataset.status).toBe("restoring");
            expect(menu.dataset.dotStatus).toBe("caution");
            expect(menu.querySelector(".cs-work-workspace-menu-status-label")?.textContent?.trim()).toBe(
                "Restoring...",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-hint")?.textContent?.trim()).toBe(
                "Loading your saved workspace folder.",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-actions")).toBeNull();

            // 6. unsupported
            update({ status: "unsupported" });
            expect(menu.dataset.status).toBe("unsupported");
            expect(menu.dataset.dotStatus).toBe("negative");
            expect(menu.querySelector(".cs-work-workspace-menu-status-label")?.textContent?.trim()).toBe(
                "Not supported",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-hint")?.textContent?.trim()).toBe(
                "Please use Chrome or Edge.",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-actions")).toBeNull();
        });

        test("fires onselect, ongrant, ondisconnect, calls hidePopover(), and omits Disconnect when ondisconnect is absent", () => {
            const onselect = vi.fn();
            const ongrant = vi.fn();
            const ondisconnect = vi.fn();

            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-actions",
                status: "needs-permission",
                onselect,
                ongrant,
                ondisconnect,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            ensurePopoverStub(menu);

            getButtonByText(menu, "Grant access")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(1);
            expect(ongrant).toHaveBeenCalledTimes(1);

            getButtonByText(menu, "Change")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(2);
            expect(onselect).toHaveBeenCalledTimes(1);

            getButtonByText(menu, "Disconnect")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(3);
            expect(ondisconnect).toHaveBeenCalledTimes(1);

            // Omit Disconnect when ondisconnect is undefined across ready, needs-permission, and stale
            update({ ondisconnect: undefined });
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();

            update({ status: "ready" });
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();
            getButtonByText(menu, "Change")?.click();
            expect(onselect).toHaveBeenCalledTimes(2);

            update({ status: "stale" });
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();
            getButtonByText(menu, "Select again")?.click();
            expect(onselect).toHaveBeenCalledTimes(3);
        });

        test("respects busy={true} by setting data-busy and disabling action buttons, and renders errorMessage alert", () => {
            const onselect = vi.fn();
            const ondisconnect = vi.fn();

            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-busy",
                status: "ready",
                busy: true,
                errorMessage: "  Sync failed  ",
                onselect,
                ondisconnect,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            expect("busy" in menu.dataset).toBe(true);

            const alert = menu.querySelector<HTMLElement>('[role="alert"]');
            expect(alert).not.toBeNull();
            expect(alert?.textContent?.trim()).toBe("Sync failed");

            const changeBtn = mustGetButtonByText(menu, "Change");
            const disconnectBtn = mustGetButtonByText(menu, "Disconnect");
            expect(changeBtn.disabled).toBe(true);
            expect(disconnectBtn.disabled).toBe(true);

            changeBtn.click();
            disconnectBtn.click();
            expect(onselect).not.toHaveBeenCalled();
            expect(ondisconnect).not.toHaveBeenCalled();

            update({ busy: false, errorMessage: "" });
            expect("busy" in menu.dataset).toBe(false);
            expect(menu.querySelector('[role="alert"]')).toBeNull();
            expect(changeBtn.disabled).toBe(false);
            expect(disconnectBtn.disabled).toBe(false);
        });
    });
});
