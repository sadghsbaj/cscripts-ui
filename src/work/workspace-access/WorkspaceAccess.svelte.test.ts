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
    const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, "location");

    function stubWindowLocation(location: Pick<Location, "protocol" | "host">): void {
        Object.defineProperty(window, "location", {
            value: location,
            configurable: true,
        });
    }

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
        if (originalLocationDescriptor) {
            Object.defineProperty(window, "location", originalLocationDescriptor);
        } else {
            delete (window as unknown as { location?: unknown }).location;
        }
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
            expect(infoTrigger?.getAttribute("aria-label")).toBe("Why is this needed?");
            expect(infoPopover?.id).toBeTruthy();
            expect(infoPopover?.id.endsWith("-info")).toBe(true);
            expect(infoTrigger?.getAttribute("popovertarget")).toBe(infoPopover?.id);
            expect(infoTrigger?.style.getPropertyValue("anchor-name")).toBe(
                `--anchor-${infoPopover?.id}`,
            );
            expect(infoTrigger?.hasAttribute("aria-describedby")).toBe(false);
            expect(container.querySelector('[role="tooltip"]')).toBeNull();
        });

        test("places primary CTA as the first focusable element before the info trigger across actionable states", () => {
            const { update } = mountReactive(WorkWorkspaceGate, container, instances, {
                status: "unlinked",
            });

            const assertPrimaryFirst = (expectedLabel: string): void => {
                const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-gate");
                const buttons = [...dialog.querySelectorAll<HTMLButtonElement>("button")];
                const primaryCta = mustGetButtonByText(dialog, expectedLabel);
                const infoTrigger = mustQuery<HTMLButtonElement>(
                    dialog,
                    ".cs-work-workspace-gate-info-trigger",
                );

                expect(buttons[0]).toBe(primaryCta);
                expect(
                    primaryCta.compareDocumentPosition(infoTrigger) &
                        Node.DOCUMENT_POSITION_FOLLOWING,
                ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            };

            assertPrimaryFirst("Select folder");

            update({ status: "needs-permission" });
            assertPrimaryFirst("Grant access");

            update({ status: "stale" });
            assertPrimaryFirst("Select again");
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
            ).toBe("Choose the folder where data is stored safely.");
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
            ).toBe("Choose the folder where data for Holzanalysen is stored safely.");

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

        test("renders UNC network-path copy when status === 'unsupported' under UNC file:// origin", () => {
            stubWindowLocation({ protocol: "file:", host: "pfleiderer.loc" });
            mountReactive(WorkWorkspaceGate, container, instances, { status: "unsupported" });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-gate");
            expect(dialog.dataset.status).toBe("unsupported");
            expect(
                container.querySelector(".cs-work-workspace-gate-title")?.textContent?.trim(),
            ).toBe("Network path not supported");
            expect(
                container.querySelector(".cs-work-workspace-gate-description")?.textContent?.trim(),
            ).toBe(
                String.raw`This file was opened via a UNC network path. Please open it from a mapped drive (e.g. G:\…) instead of \\server\…`,
            );
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

        test("focusTrap is inactive when rendered inline, and active inside .cs-overlay where Escape closes info popover or nudges", () => {
            // 1. Inline (not inside .cs-overlay): focusTrap does not steal focus or intercept Escape
            const outsideButton = document.createElement("button");
            outsideButton.textContent = "Outside";
            document.body.append(outsideButton);
            outsideButton.focus();
            expect(document.activeElement).toBe(outsideButton);

            const inlineTarget = document.createElement("div");
            container.append(inlineTarget);
            mountReactive(WorkWorkspaceGate, inlineTarget, instances, { status: "unlinked" });
            vi.advanceTimersByTime(20);

            const inlineDialog = mustQuery<HTMLDivElement>(inlineTarget, ".cs-work-workspace-gate");
            expect(document.activeElement).toBe(outsideButton);

            const inlineEscape = dispatchKey("Escape");
            flushSync();
            expect(inlineEscape.defaultPrevented).toBe(false);
            expect("blocked" in inlineDialog.dataset).toBe(false);

            // Unmount inline gate before mounting inside .cs-overlay
            const inlineInstance = instances.pop();
            if (inlineInstance) unmount(inlineInstance);
            inlineTarget.remove();

            // 2. Inside .cs-overlay: focusTrap activates, focuses primary CTA first, and handles Escape
            const overlay = document.createElement("div");
            overlay.className = "cs-overlay";
            container.append(overlay);

            mountReactive(WorkWorkspaceGate, overlay, instances, { status: "unlinked" });
            vi.advanceTimersByTime(20);
            const dialog = mustQuery<HTMLDivElement>(overlay, ".cs-work-workspace-gate");
            const primaryCta = mustGetButtonByText(dialog, "Select folder");
            expect(document.activeElement).toBe(primaryCta);

            const infoPopover = mustQuery<HTMLDivElement>(
                overlay,
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

            outsideButton.remove();
        });
    });

    describe("WorkWorkspaceMenu", () => {
        test("renders Workspace header, default offset, folder box/fallback, captions/hints, and state-specific actions across all 6 statuses", () => {
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
            expect(menu.getAttribute("aria-label")).toBe("Workspace");
            expect(menu.getAttribute("popover")).toBe("auto");
            expect(menu.style.getPropertyValue("--cs-popover-offset")).toBe("24px");
            ensurePopoverStub(menu);

            const readyBadge = mustQuery<HTMLElement>(menu, ".cs-badge");
            expect(readyBadge.dataset.variant).toBe("soft");
            expect(readyBadge.dataset.color).toBe("positive");
            expect(readyBadge.dataset.size).toBe("xs");
            expect(readyBadge.textContent?.trim()).toBe("Connected");
            expect(menu.querySelector(".cs-work-workspace-menu-title")?.textContent?.trim()).toBe(
                "Workspace",
            );

            // 1. ready with directoryName
            expect(menu.dataset.status).toBe("ready");
            const readyFolder = mustQuery<HTMLDivElement>(menu, ".cs-work-workspace-menu-folder");
            expect("empty" in readyFolder.dataset).toBe(false);
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Kundenordner",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-caption")).toBeNull();
            const readyChangeBtn = mustGetButtonByText(menu, "Change");
            const readyDisconnectBtn = mustGetButtonByText(menu, "Disconnect");
            expect(readyChangeBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect("destructive" in readyChangeBtn.dataset).toBe(false);
            expect(readyDisconnectBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect("destructive" in readyDisconnectBtn.dataset).toBe(true);

            // ready fallback when directoryName is omitted
            update({ directoryName: null });
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Selected folder",
            );

            // 2. needs-permission
            update({ status: "needs-permission", directoryName: "Holz-DB" });
            expect(menu.dataset.status).toBe("needs-permission");
            expect(menu.querySelector(".cs-badge")).toBeNull();
            const needsPermFolder = mustQuery<HTMLDivElement>(menu, ".cs-work-workspace-menu-folder");
            expect("empty" in needsPermFolder.dataset).toBe(false);
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Holz-DB",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-caption")?.textContent?.trim()).toBe(
                "Permission required",
            );
            const grantBtn = mustGetButtonByText(menu, "Grant access");
            const needsPermChangeBtn = mustGetButtonByText(menu, "Change");
            expect(grantBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect(grantBtn.dataset.emphasis).toBe("accent");
            expect(needsPermChangeBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();

            // needs-permission fallback when directoryName is omitted
            update({ directoryName: null });
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "No folder selected",
            );

            // 3. stale
            update({ status: "stale", directoryName: "Alter-Ordner" });
            expect(menu.dataset.status).toBe("stale");
            expect(menu.querySelector(".cs-badge")).toBeNull();
            const staleFolder = mustQuery<HTMLDivElement>(menu, ".cs-work-workspace-menu-folder");
            expect("empty" in staleFolder.dataset).toBe(false);
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Alter-Ordner",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-caption")?.textContent?.trim()).toBe(
                "Folder no longer found",
            );
            const selectAgainBtn = mustGetButtonByText(menu, "Select again");
            const staleDisconnectBtn = mustGetButtonByText(menu, "Disconnect");
            expect(selectAgainBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect(selectAgainBtn.dataset.emphasis).toBe("accent");
            expect(staleDisconnectBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect("destructive" in staleDisconnectBtn.dataset).toBe(true);

            // 4. unlinked
            update({ status: "unlinked" });
            expect(menu.dataset.status).toBe("unlinked");
            expect(menu.querySelector(".cs-badge")).toBeNull();
            const unlinkedFolder = mustQuery<HTMLDivElement>(menu, ".cs-work-workspace-menu-folder");
            expect("empty" in unlinkedFolder.dataset).toBe(true);
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "No folder selected",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-caption")).toBeNull();
            expect(menu.querySelector(".cs-work-workspace-menu-hint")).toBeNull();
            const unlinkedSelectBtn = mustGetButtonByText(menu, "Select folder");
            expect(unlinkedSelectBtn.classList.contains("cs-work-workspace-menu-item")).toBe(true);
            expect(unlinkedSelectBtn.dataset.emphasis).toBe("accent");
            expect(menu.querySelector(".cs-work-workspace-menu-cta")).toBeNull();
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();

            // 5. restoring
            update({ status: "restoring" });
            expect(menu.dataset.status).toBe("restoring");
            expect(menu.querySelector(".cs-work-workspace-menu-folder")).toBeNull();
            expect(menu.querySelector(".cs-work-workspace-menu-hint")?.textContent?.trim()).toBe(
                "Loading your saved workspace folder.",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-actions")).toBeNull();

            // 6. unsupported
            update({ status: "unsupported" });
            expect(menu.dataset.status).toBe("unsupported");
            expect(menu.querySelector(".cs-work-workspace-menu-folder")).toBeNull();
            expect(menu.querySelector(".cs-work-workspace-menu-hint")?.textContent?.trim()).toBe(
                "Please use Chrome or Edge.",
            );
            expect(menu.querySelector(".cs-work-workspace-menu-actions")).toBeNull();
        });

        test("renders UNC network-path hint when status === 'unsupported' under UNC file:// origin", () => {
            stubWindowLocation({ protocol: "file:", host: "pfleiderer.loc" });
            mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-unc",
                status: "unsupported",
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            expect(menu.dataset.status).toBe("unsupported");
            expect(menu.querySelector(".cs-work-workspace-menu-folder")).toBeNull();
            expect(menu.querySelector(".cs-work-workspace-menu-hint")?.textContent?.trim()).toBe(
                "Please open via a mapped drive letter.",
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

            const finishClose = (): void => {
                menu.dispatchEvent(new Event("transitionend"));
                flushSync();
            };

            getButtonByText(menu, "Grant access")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(1);
            expect(ongrant).toHaveBeenCalledTimes(1);
            finishClose();

            getButtonByText(menu, "Change")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(2);
            expect(onselect).toHaveBeenCalledTimes(1);
            finishClose();

            update({ status: "ready" });
            getButtonByText(menu, "Disconnect")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(3);
            expect(ondisconnect).toHaveBeenCalledTimes(1);
            finishClose();

            update({ status: "stale" });
            getButtonByText(menu, "Disconnect")?.click();
            expect(menu.hidePopover).toHaveBeenCalledTimes(4);
            expect(ondisconnect).toHaveBeenCalledTimes(2);
            finishClose();

            // Omit Disconnect when ondisconnect is undefined across ready and stale
            update({ ondisconnect: undefined });
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();
            getButtonByText(menu, "Select again")?.click();
            expect(onselect).toHaveBeenCalledTimes(2);
            finishClose();

            update({ status: "ready" });
            expect(getButtonByText(menu, "Disconnect")).toBeUndefined();
            getButtonByText(menu, "Change")?.click();
            expect(onselect).toHaveBeenCalledTimes(3);
        });

        test("freezes displayed state while closing after an action until transitionend or open-toggle resets it", () => {
            const controller: {
                update?: (next: Partial<{ status: WorkspaceAccessStatus; directoryName: string | null }>) => void;
            } = {};

            const onselect = vi.fn(() => {
                controller.update?.({ status: "ready", directoryName: "Kundenordner" });
            });
            const ondisconnect = vi.fn(() => {
                controller.update?.({ status: "unlinked", directoryName: null });
            });

            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-freeze",
                status: "unlinked",
                directoryName: null,
                onselect,
                ondisconnect,
            });
            controller.update = update;

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            ensurePopoverStub(menu);

            const dispatchOpenToggle = (): void => {
                openPopovers.add(menu);
                menu.dispatchEvent(
                    Object.assign(new Event("beforetoggle"), {
                        newState: "open",
                        oldState: "closed",
                    }),
                );
                flushSync();
            };

            // 1. Open in unlinked state and click "Select folder" -> synchronously transitions status to "ready"
            dispatchOpenToggle();
            const selectBtn = mustGetButtonByText(menu, "Select folder");
            selectBtn.click();
            flushSync();

            expect(onselect).toHaveBeenCalledTimes(1);
            expect(menu.hidePopover).toHaveBeenCalledTimes(1);
            // Frozen on "unlinked" while closing
            expect(menu.dataset.status).toBe("unlinked");
            expect(menu.querySelector(".cs-work-workspace-menu-hint")).toBeNull();
            const frozenUnlinkedFolder = mustQuery<HTMLDivElement>(
                menu,
                ".cs-work-workspace-menu-folder",
            );
            expect("empty" in frozenUnlinkedFolder.dataset).toBe(true);
            expect(
                frozenUnlinkedFolder.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim(),
            ).toBe("No folder selected");
            expect(getButtonByText(menu, "Select folder")).toBeDefined();

            // Bubbling child transitionend must NOT unfreeze
            selectBtn.dispatchEvent(new Event("transitionend", { bubbles: true }));
            flushSync();
            expect(menu.dataset.status).toBe("unlinked");

            // Self transitionend while other property animations are still running must NOT unfreeze
            menu.getAnimations = vi.fn(() => [{} as Animation]);
            menu.dispatchEvent(new Event("transitionend"));
            flushSync();
            expect(menu.dataset.status).toBe("unlinked");

            // Self transitionend when closed and getAnimations() is empty unfreezes and renders "ready"
            menu.getAnimations = vi.fn(() => []);
            menu.dispatchEvent(new Event("transitionend"));
            flushSync();
            expect(menu.dataset.status).toBe("ready");
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Kundenordner",
            );
            expect(getButtonByText(menu, "Change")).toBeDefined();
            expect(getButtonByText(menu, "Disconnect")).toBeDefined();

            // 2. Reopen in "ready", click "Disconnect" -> synchronously transitions to "unlinked", frozen until open-toggle
            dispatchOpenToggle();
            mustGetButtonByText(menu, "Disconnect").click();
            flushSync();

            expect(ondisconnect).toHaveBeenCalledTimes(1);
            expect(menu.dataset.status).toBe("ready");
            expect(menu.querySelector(".cs-work-workspace-menu-folder-name")?.textContent?.trim()).toBe(
                "Kundenordner",
            );

            // Reopening via beforetoggle (newState: "open") resets closing even if transitionend never fired
            dispatchOpenToggle();
            expect(menu.dataset.status).toBe("unlinked");
            expect(getButtonByText(menu, "Select folder")).toBeDefined();
        });

        test("beforetoggle (newState: 'closed') keeps state frozen while animations run or visible, and unfreezes on second rAF when getAnimations() is empty and display === 'none'", () => {
            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-closed-toggle",
                status: "unlinked",
                directoryName: null,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            ensurePopoverStub(menu);

            const dispatchToggle = (newState: "open" | "closed"): void => {
                if (newState === "open") {
                    openPopovers.add(menu);
                    menu.style.display = "block";
                } else {
                    openPopovers.delete(menu);
                }
                menu.dispatchEvent(
                    Object.assign(new Event("beforetoggle"), {
                        newState,
                        oldState: newState === "open" ? "closed" : "open",
                    }),
                );
                flushSync();
            };

            // 1. Active exit animation: getAnimations() non-empty keeps state frozen past double rAF
            dispatchToggle("open");
            menu.getAnimations = vi.fn(() => [{} as Animation]);
            menu.style.display = "none";
            dispatchToggle("closed");

            update({ status: "ready", directoryName: "Kundenordner" });
            expect(menu.dataset.status).toBe("unlinked");

            vi.advanceTimersByTime(40);
            flushSync();
            expect(menu.getAnimations).toHaveBeenCalled();
            expect(menu.dataset.status).toBe("unlinked");
            expect(menu.querySelector(".cs-work-workspace-menu-folder")).not.toBeNull();

            // 2. Empty getAnimations() but display !== "none" keeps state frozen past double rAF
            dispatchToggle("open");
            expect(menu.dataset.status).toBe("ready");

            menu.getAnimations = vi.fn(() => []);
            menu.style.display = "block";
            dispatchToggle("closed");

            update({ status: "stale", directoryName: "Alter-Ordner" });
            vi.advanceTimersByTime(40);
            flushSync();
            expect(menu.getAnimations).toHaveBeenCalled();
            expect(menu.dataset.status).toBe("ready");

            // 3. Instant / reduced-motion close: getAnimations() empty and display === "none" unfreezes on second rAF
            dispatchToggle("open");
            expect(menu.dataset.status).toBe("stale");

            menu.getAnimations = vi.fn(() => []);
            menu.style.display = "none";
            dispatchToggle("closed");

            update({ status: "unlinked", directoryName: null });
            expect(menu.dataset.status).toBe("stale");

            // First rAF tick: still frozen
            vi.advanceTimersByTime(16);
            flushSync();
            expect(menu.getAnimations).not.toHaveBeenCalled();
            expect(menu.dataset.status).toBe("stale");

            // Second rAF tick: unfreezes and renders "unlinked"
            vi.advanceTimersByTime(20);
            flushSync();
            expect(menu.getAnimations).toHaveBeenCalledTimes(1);
            expect(menu.dataset.status).toBe("unlinked");
            const unlinkedFolder = mustQuery<HTMLDivElement>(
                menu,
                ".cs-work-workspace-menu-folder",
            );
            expect("empty" in unlinkedFolder.dataset).toBe(true);
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

        test("activates a menu item on mouse press-drag-release (pointerdown -> beforetoggle open -> pointerup) and freezes/closes cleanly", () => {
            const onselect = vi.fn();
            const ondisconnect = vi.fn();

            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-drag-release",
                status: "unlinked",
                directoryName: null,
                onselect,
                ondisconnect,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            ensurePopoverStub(menu);

            const openWithMousePress = (): void => {
                window.dispatchEvent(
                    new PointerEvent("pointerdown", {
                        pointerType: "mouse",
                        button: 0,
                        clientX: 0,
                        clientY: 0,
                        bubbles: true,
                    }),
                );
                openPopovers.add(menu);
                menu.dispatchEvent(
                    Object.assign(new Event("beforetoggle"), {
                        newState: "open",
                        oldState: "closed",
                    }),
                );
                flushSync();
            };

            // Stationary pointerdown -> pointerup at (0, 0) within < 180ms does NOT commit
            openWithMousePress();
            const selectBtn = mustGetButtonByText(menu, "Select folder");
            selectBtn.dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 0,
                    clientY: 0,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(onselect).not.toHaveBeenCalled();
            expect(menu.hidePopover).not.toHaveBeenCalled();

            // Real pointer drag (clientX: 40, clientY: 80) commits on pointerup
            openPopovers.delete(menu);
            openWithMousePress();
            selectBtn.dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 40,
                    clientY: 80,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(onselect).toHaveBeenCalledTimes(1);
            expect(menu.hidePopover).toHaveBeenCalledTimes(1);
            expect(openPopovers.has(menu)).toBe(false);

            // State stays frozen while closing until transitionend/open-toggle
            update({ status: "ready", directoryName: "Kundenordner" });
            expect(menu.dataset.status).toBe("unlinked");

            // Reopen in "ready" via mouse press-drag-release on a child span inside "Disconnect"
            openWithMousePress();
            expect(menu.dataset.status).toBe("ready");

            const disconnectBtn = mustGetButtonByText(menu, "Disconnect");
            const disconnectLabel = mustQuery<HTMLSpanElement>(disconnectBtn, "span");
            disconnectLabel.dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 40,
                    clientY: 80,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(ondisconnect).toHaveBeenCalledTimes(1);
            expect(menu.hidePopover).toHaveBeenCalledTimes(2);
            expect(openPopovers.has(menu)).toBe(false);
        });

        test("ignores pointerup during press-drag-release when busy={true} or pointerup lands outside items", () => {
            const onselect = vi.fn();
            const ondisconnect = vi.fn();

            const { update } = mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-drag-ignore",
                status: "ready",
                busy: true,
                onselect,
                ondisconnect,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            ensurePopoverStub(menu);

            const openWithMousePress = (): void => {
                window.dispatchEvent(
                    new PointerEvent("pointerdown", {
                        pointerType: "mouse",
                        button: 0,
                        clientX: 0,
                        clientY: 0,
                        bubbles: true,
                    }),
                );
                openPopovers.add(menu);
                menu.dispatchEvent(
                    Object.assign(new Event("beforetoggle"), {
                        newState: "open",
                        oldState: "closed",
                    }),
                );
                flushSync();
            };

            // 1. Disabled menu item (busy={true})
            openWithMousePress();
            mustGetButtonByText(menu, "Change").dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 40,
                    clientY: 80,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(onselect).not.toHaveBeenCalled();
            expect(ondisconnect).not.toHaveBeenCalled();
            expect(menu.hidePopover).not.toHaveBeenCalled();

            // 2. pointerup on non-item element inside menu (.cs-work-workspace-menu-title)
            openPopovers.delete(menu);
            update({ busy: false });
            openWithMousePress();

            mustQuery<HTMLSpanElement>(menu, ".cs-work-workspace-menu-title").dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 40,
                    clientY: 80,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(onselect).not.toHaveBeenCalled();
            expect(ondisconnect).not.toHaveBeenCalled();
            expect(menu.hidePopover).not.toHaveBeenCalled();

            // 3. pointerup on window outside menu
            openPopovers.delete(menu);
            openWithMousePress();

            window.dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 40,
                    clientY: 80,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(onselect).not.toHaveBeenCalled();
            expect(ondisconnect).not.toHaveBeenCalled();
            expect(menu.hidePopover).not.toHaveBeenCalled();
        });

        test("does not fire item.click() on pointerup when menu was opened without a preceding mouse pointerdown", () => {
            const onselect = vi.fn();

            mountReactive(WorkWorkspaceMenu, container, instances, {
                id: "ws-menu-keyboard-open",
                status: "unlinked",
                onselect,
            });

            const menu = mustQuery<HTMLDivElement>(container, ".cs-work-workspace-menu");
            ensurePopoverStub(menu);

            // Open without preceding mouse pointerdown (e.g. keyboard open)
            openPopovers.add(menu);
            menu.dispatchEvent(
                Object.assign(new Event("beforetoggle"), {
                    newState: "open",
                    oldState: "closed",
                }),
            );
            flushSync();

            const selectBtn = mustGetButtonByText(menu, "Select folder");
            const clickSpy = vi.spyOn(selectBtn, "click");

            selectBtn.dispatchEvent(
                new PointerEvent("pointerup", {
                    pointerType: "mouse",
                    button: 0,
                    clientX: 40,
                    clientY: 80,
                    bubbles: true,
                }),
            );
            flushSync();

            expect(clickSpy).not.toHaveBeenCalled();
            expect(onselect).not.toHaveBeenCalled();
            expect(menu.hidePopover).not.toHaveBeenCalled();
        });
    });

    describe("WorkspaceAccess.preview.svelte anchor wiring", () => {
        test("sets menu anchor-name on .cs-work-app-header-segment instead of .cs-work-app-status-dot and uses bottom-start placement", async () => {
            const { default: WorkspaceAccessPreview } = await import("./WorkspaceAccess.preview.svelte");
            const instance = mount(WorkspaceAccessPreview, { target: container });
            instances.push(instance);
            flushSync();

            const segment = mustQuery<HTMLElement>(container, ".cs-work-app-header-segment");
            const dot = mustQuery<HTMLElement>(container, ".cs-work-app-status-dot");
            const menu = mustQuery<HTMLElement>(container, ".cs-work-workspace-menu");

            expect(menu.dataset.placement).toBe("bottom-start");
            expect(segment.style.getPropertyValue("anchor-name")).toBe(`--anchor-${menu.id}`);
            expect(dot.style.getPropertyValue("anchor-name")).not.toContain(`--anchor-${menu.id}`);
        });
    });
});
